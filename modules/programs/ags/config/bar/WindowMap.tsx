import { createEffect, onCleanup } from "ags"
import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import { barBounds } from "../widgets/PopupWindow"
import { closeWindow, focusWindow, type createNiri } from "../services/niri"
import {
  activeWorkspaceOnOutput,
  previousWindowIdOnWorkspace,
  windowColumnsOnOutput,
  type NiriWindow,
} from "../services/niri-state"
import {
  fitWindowMap,
  fitWindowMapViewport,
  interpolateRectangle,
  interpolateValue,
  type WindowMapLayout,
  type WindowMapRectangle,
  type WindowMapTile,
  type WindowMapViewport,
} from "../services/window-map"

const HEIGHT = 24
const VIEWPORT_HEIGHT = 2
const VIEWPORT_GAP = 1
const TILE_TOP = VIEWPORT_HEIGHT + VIEWPORT_GAP
const MAP_HEIGHT = HEIGHT + 2 * TILE_TOP
const TRAILING_GAP = 8
const DURATION_US = 180_000

interface AnimatedTile {
  button: Gtk.Button
  window: Astal.Window
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
  outputWidth,
  outputHeight,
}: {
  niri: ReturnType<typeof createNiri>
  output: string
  outputWidth: number
  outputHeight: number
}) {
  const view = niri.state((state) => {
    const columns = windowColumnsOnOutput(state, output)
    const layout = fitWindowMap(columns, outputHeight, HEIGHT)
    return {
      workspaceId: activeWorkspaceOnOutput(state, output)?.id ?? null,
      layout,
      viewport: fitWindowMapViewport(layout, columns, outputWidth, outputHeight),
    }
  })
  // Reserve the map's space in the bar. Each tile needs its own surface so
  // compositor blur stops at its edges, leaving the gaps transparent.
  const root = new Gtk.DrawingArea({ can_target: false })
  const tiles = new Map<number, AnimatedTile>()
  root.add_css_class("WindowMap")
  root.set_valign(Gtk.Align.CENTER)
  root.set_visible(true)
  root.set_size_request(0, MAP_HEIGHT)

  let currentWidth = 0
  let fromWidth = 0
  let toWidth = 0
  let currentViewport: WindowMapViewport | null = null
  let fromViewport: WindowMapViewport | null = null
  let toViewport: WindowMapViewport | null = null
  let currentWorkspaceId: number | null | undefined
  let animationStarted = 0
  let tickId: number | undefined

  // The wallpaper preview borrows the bar's widgets for its accent preview.
  function inWallpaperPreview() {
    return (root.get_root() as Gtk.Widget | null)?.has_css_class("WallpaperPreview")
  }

  root.set_draw_func((widget, cr, width) => {
    if (!currentViewport || inWallpaperPreview()) return
    const left = Math.round(currentViewport.left)
    const right = Math.min(Math.round(currentViewport.right), width - TRAILING_GAP)
    if (right <= left) return
    const [hasForeground, foreground] = widget.get_style_context().lookup_color("foreground")
    const color = hasForeground ? foreground : widget.get_color()
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha * 0.82)
    cr.rectangle(left, 0, right - left, VIEWPORT_HEIGHT)
    cr.fill()
  })

  function outerWidth(layout: WindowMapLayout) {
    return layout.tiles.length > 0 ? layout.width + TRAILING_GAP : 0
  }

  function placeTiles() {
    const bounds = barBounds(root)
    const bar = root.get_root() as Astal.Window | null
    if (!bounds || !bar?.gdkmonitor) return
    for (const tile of tiles.values()) {
      const x = Math.max(0, Math.round(tile.current.x))
      const y = Math.max(0, Math.round(tile.current.y))
      const width = Math.min(Math.max(1, Math.round(tile.current.width)), bounds.width - x)
      const height = Math.min(Math.max(1, Math.round(tile.current.height)), HEIGHT - y)
      if (width <= 0 || height <= 0) {
        tile.window.set_visible(false)
        continue
      }
      if (tile.window.gdkmonitor !== bar.gdkmonitor) tile.window.gdkmonitor = bar.gdkmonitor
      const left = Math.round(bounds.x + x)
      const top = Math.round(bounds.y + TILE_TOP + y)
      if (tile.window.margin_left !== left) tile.window.margin_left = left
      if (tile.window.margin_top !== top) tile.window.margin_top = top
      tile.window.set_size_request(width, height)
      tile.window.set_default_size(width, height)
      tile.window.set_visible(true)
    }
  }

  function applyFrame(now: number) {
    const progress = (now - animationStarted) / DURATION_US
    for (const tile of tiles.values()) {
      tile.current = interpolateRectangle(tile.from, tile.to, progress)
      tile.opacity = interpolateValue(tile.fromOpacity, tile.toOpacity, progress)
      tile.button.set_opacity(tile.opacity)
    }
    currentWidth = interpolateValue(fromWidth, toWidth, progress)
    if (fromViewport && toViewport)
      currentViewport = {
        left: interpolateValue(fromViewport.left, toViewport.left, progress),
        right: interpolateValue(fromViewport.right, toViewport.right, progress),
      }
    root.set_size_request(Math.max(0, Math.round(currentWidth)), MAP_HEIGHT)
    root.queue_draw()

    if (progress < 1) return true
    for (const [id, tile] of tiles)
      if (tile.removing) {
        tile.window.destroy()
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
    const window = new Astal.Window({
      name: `window-map-tile-${output}-${tile.window.id}`,
      namespace: "ags-window-map-tile",
      css_classes: ["WindowMapTile"],
      anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
      layer: Astal.Layer.TOP,
      exclusivity: Astal.Exclusivity.IGNORE,
      keymode: Astal.Keymode.NONE,
      child: button,
    })
    app.add_window(window)

    const start = animate ? collapsed(tile) : tile
    const animated: AnimatedTile = {
      button,
      window,
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

    button.set_visible(true)
    button.set_opacity(animated.opacity)
    return animated
  }

  function applyImmediately(target: WindowMapLayout, viewport: WindowMapViewport | null) {
    if (tickId !== undefined) {
      root.remove_tick_callback(tickId)
      tickId = undefined
    }
    for (const tile of tiles.values()) tile.window.destroy()
    tiles.clear()
    for (const targetTile of target.tiles)
      tiles.set(targetTile.window.id, createTile(targetTile, false))

    currentWidth = outerWidth(target)
    fromWidth = currentWidth
    toWidth = currentWidth
    currentViewport = fromViewport = toViewport = viewport
    root.set_size_request(currentWidth, MAP_HEIGHT)
    root.queue_draw()
  }

  function sync(target: ReturnType<typeof view>) {
    const workspaceChanged =
      currentWorkspaceId !== undefined && currentWorkspaceId !== target.workspaceId
    currentWorkspaceId = target.workspaceId
    if (workspaceChanged) {
      applyImmediately(target.layout, target.viewport)
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
    let changed =
      toWidth !== targetWidth ||
      toViewport?.left !== target.viewport?.left ||
      toViewport?.right !== target.viewport?.right
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
    toViewport = target.viewport
    fromViewport = currentViewport = toViewport ? (currentViewport ?? toViewport) : null

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
  // Follow bar layout changes without requesting frames while the map is idle.
  let disconnectPlacement: (() => void) | undefined
  const mapped = root.connect_after("map", () => {
    if (inWallpaperPreview()) return
    const clock = root.get_frame_clock()!
    const painted = clock.connect_after("after-paint", placeTiles)
    disconnectPlacement = () => clock.disconnect(painted)
  })
  const unmapped = root.connect("unmap", () => {
    disconnectPlacement?.()
    disconnectPlacement = undefined
    for (const tile of tiles.values()) tile.window.set_visible(false)
  })
  onCleanup(() => {
    if (tickId !== undefined) root.remove_tick_callback(tickId)
    disconnectPlacement?.()
    root.disconnect(mapped)
    root.disconnect(unmapped)
    for (const tile of tiles.values()) tile.window.destroy()
    tiles.clear()
  })
  return root
}
