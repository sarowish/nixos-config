import { createEffect, onCleanup } from "ags"
import { Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import { closeWindow, focusWindow, type createNiri } from "../services/niri"
import {
  activeWorkspaceOnOutput,
  previousWindowIdOnWorkspace,
  windowColumnsOnOutput,
  type NiriWindow,
} from "../services/niri-state"
import {
  fitWindowMap,
  interpolateRectangle,
  interpolateValue,
  type WindowMapLayout,
  type WindowMapRectangle,
  type WindowMapTile,
} from "../services/window-map"

const HEIGHT = 24
const TRAILING_GAP = 8
const DURATION_US = 180_000

interface AnimatedTile {
  button: Gtk.Button
  current: WindowMapRectangle
  from: WindowMapRectangle
  to: WindowMapRectangle
  opacity: number
  fromOpacity: number
  toOpacity: number
  removing: boolean
}

function sameRectangle(left: WindowMapRectangle, right: WindowMapRectangle) {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

function collapsed(rectangle: WindowMapRectangle) {
  return {
    x: rectangle.x + (rectangle.width - 1) / 2,
    y: rectangle.y + (rectangle.height - 1) / 2,
    width: 1,
    height: 1,
  }
}

function updateClasses(button: Gtk.Button, window: NiriWindow) {
  for (const [name, enabled] of [
    ["focused", window.is_focused],
    ["urgent", window.is_urgent],
  ] as const)
    if (enabled) button.add_css_class(name)
    else button.remove_css_class(name)
}

export default function WindowMap({
  niri,
  output,
  outputHeight,
}: {
  niri: ReturnType<typeof createNiri>
  output: string
  outputHeight: number
}) {
  const view = niri.state((state) => ({
    workspaceId: activeWorkspaceOnOutput(state, output)?.id ?? null,
    layout: fitWindowMap(windowColumnsOnOutput(state, output), outputHeight, HEIGHT),
  }))
  const root = new Gtk.Overlay()
  const spacer = new Gtk.Box()
  const fixed = new Gtk.Fixed()
  const tiles = new Map<number, AnimatedTile>()
  root.add_css_class("WindowMap")
  root.set_valign(Gtk.Align.CENTER)
  root.set_overflow(Gtk.Overflow.HIDDEN)
  root.set_child(spacer)
  root.add_overlay(fixed)
  root.set_clip_overlay(fixed, true)
  root.set_measure_overlay(fixed, false)
  root.set_visible(true)
  spacer.set_size_request(0, HEIGHT)
  fixed.set_halign(Gtk.Align.START)
  fixed.set_valign(Gtk.Align.START)

  let currentWidth = 0
  let fromWidth = 0
  let toWidth = 0
  let currentWorkspaceId: number | null | undefined
  let animationStarted = 0
  let tickId: number | undefined

  function outerWidth(layout: WindowMapLayout) {
    return layout.tiles.length > 0 ? layout.width + TRAILING_GAP : 0
  }

  function applyGeometry(tile: AnimatedTile) {
    fixed.move(tile.button, Math.round(tile.current.x), Math.round(tile.current.y))
    tile.button.set_size_request(
      Math.max(1, Math.round(tile.current.width)),
      Math.max(1, Math.round(tile.current.height)),
    )
    tile.button.set_opacity(tile.opacity)
  }

  function applyFrame(now: number) {
    const progress = (now - animationStarted) / DURATION_US
    for (const tile of tiles.values()) {
      tile.current = interpolateRectangle(tile.from, tile.to, progress)
      tile.opacity = interpolateValue(tile.fromOpacity, tile.toOpacity, progress)
      applyGeometry(tile)
    }
    currentWidth = interpolateValue(fromWidth, toWidth, progress)
    spacer.set_size_request(Math.max(0, Math.round(currentWidth)), HEIGHT)

    if (progress < 1) return true
    for (const [id, tile] of tiles)
      if (tile.removing) {
        fixed.remove(tile.button)
        tiles.delete(id)
      }
    return false
  }

  function beginAnimation(now: number) {
    animationStarted = now
    if (tickId !== undefined) return
    tickId = root.add_tick_callback((_widget, frameClock) => {
      const keepGoing = applyFrame(frameClock.get_frame_time())
      if (!keepGoing) tickId = undefined
      return keepGoing
    })
  }

  function createTile(tile: WindowMapTile, animate = true) {
    const button = new Gtk.Button({ focusable: false })

    const start = animate ? collapsed(tile) : tile
    const animated: AnimatedTile = {
      button,
      current: start,
      from: start,
      to: tile,
      opacity: animate ? 0 : 1,
      fromOpacity: animate ? 0 : 1,
      toOpacity: 1,
      removing: false,
    }
    button.add_css_class("tile")
    updateClasses(button, tile.window)
    button.connect("clicked", () => {
      const state = niri.state()
      const workspace = activeWorkspaceOnOutput(state, output)
      const previousId =
        workspace?.active_window_id === tile.window.id
          ? previousWindowIdOnWorkspace(state, workspace.id)
          : null

      focusWindow(previousId ?? tile.window.id)
    })

    const middleClick = new Gtk.GestureClick({ button: Gdk.BUTTON_MIDDLE })
    middleClick.connect("pressed", (_source, _nPress, _x, _y) => closeWindow(tile.window.id))
    button.add_controller(middleClick)

    fixed.put(button, start.x, start.y)
    button.set_visible(true)
    applyGeometry(animated)
    return animated
  }

  function applyImmediately(target: WindowMapLayout) {
    if (tickId !== undefined) {
      root.remove_tick_callback(tickId)
      tickId = undefined
    }
    for (const tile of tiles.values()) fixed.remove(tile.button)
    tiles.clear()
    for (const targetTile of target.tiles)
      tiles.set(targetTile.window.id, createTile(targetTile, false))

    currentWidth = outerWidth(target)
    fromWidth = currentWidth
    toWidth = currentWidth
    spacer.set_size_request(currentWidth, HEIGHT)
  }

  function sync(target: { workspaceId: number | null; layout: WindowMapLayout }) {
    const workspaceChanged =
      currentWorkspaceId !== undefined && currentWorkspaceId !== target.workspaceId
    currentWorkspaceId = target.workspaceId
    if (workspaceChanged) {
      applyImmediately(target.layout)
      return
    }

    const now = GLib.get_monotonic_time()
    if (tickId !== undefined) {
      const activeTick = tickId
      if (!applyFrame(now)) {
        root.remove_tick_callback(activeTick)
        tickId = undefined
      }
    }

    const targets = new Map(target.layout.tiles.map((tile) => [tile.window.id, tile]))
    const targetWidth = outerWidth(target.layout)
    let changed = toWidth !== targetWidth
    for (const tile of target.layout.tiles) {
      const current = tiles.get(tile.window.id)
      if (!current || current.removing || !sameRectangle(current.to, tile)) changed = true
      if (current) updateClasses(current.button, tile.window)
    }
    for (const [id, tile] of tiles) if (!targets.has(id) && !tile.removing) changed = true
    if (!changed) return

    for (const tile of tiles.values()) {
      tile.from = tile.current
      tile.fromOpacity = tile.opacity
    }
    fromWidth = currentWidth
    toWidth = targetWidth

    for (const targetTile of target.layout.tiles) {
      const tile = tiles.get(targetTile.window.id)
      if (tile) {
        tile.to = targetTile
        tile.toOpacity = 1
        tile.removing = false
        tile.button.set_sensitive(true)
      } else tiles.set(targetTile.window.id, createTile(targetTile))
    }
    for (const [id, tile] of tiles)
      if (!targets.has(id) && !tile.removing) {
        tile.to = collapsed(tile.current)
        tile.toOpacity = 0
        tile.removing = true
        tile.button.set_sensitive(false)
      }

    beginAnimation(now)
  }

  createEffect(() => sync(view()))
  onCleanup(() => {
    if (tickId !== undefined) root.remove_tick_callback(tickId)
    tiles.clear()
  })
  return root
}
