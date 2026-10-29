import app from "ags/gtk4/app"
import { createEffect, onCleanup, type Accessor } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import GObject from "gi://GObject?version=2.0"
import Graphene from "gi://Graphene?version=1.0"
import { popupPlacement, type Rectangle } from "./popup-placement"

const AnimatedPopup = GObject.registerClass(
  class AnimatedPopup extends Gtk.Box {
    progress = 0

    vfunc_snapshot(snapshot: Gtk.Snapshot) {
      snapshot.save()
      snapshot.translate(new Graphene.Point({ x: 0, y: 6 * (1 - this.progress) }))
      snapshot.push_opacity(this.progress)
      super.vfunc_snapshot(snapshot)
      snapshot.pop()
      snapshot.restore()
    }
  },
)

export default function PopupWindow({
  anchor,
  child,
  open,
  onClose,
  name,
  className,
  align = "center",
}: {
  anchor: Gtk.Widget
  child: Gtk.Widget
  open: Accessor<boolean>
  onClose: () => void
  name: string
  className: string
  align?: "start" | "center"
}) {
  let cardBounds: Rectangle = { x: 0, y: 0, width: 0, height: 0 }
  let tick: number | undefined
  let from = 0
  let target = 0
  let started = 0
  const animated = new AnimatedPopup({ orientation: Gtk.Orientation.VERTICAL })
  animated.append(child)
  const fixed = new Gtk.Fixed()
  fixed.put(animated, 0, 0)

  const window = (
    <window
      namespace={`ags-${name}`}
      class={className}
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.EXCLUSIVE}
      anchor={
        Astal.WindowAnchor.TOP |
        Astal.WindowAnchor.BOTTOM |
        Astal.WindowAnchor.LEFT |
        Astal.WindowAnchor.RIGHT
      }
    >
      <Gtk.EventControllerKey
        onKeyPressed={(_controller, key) => {
          if (key !== Gdk.KEY_Escape) return false
          onClose()
          return true
        }}
      />
      <Gtk.GestureClick
        button={0}
        propagationPhase={Gtk.PropagationPhase.CAPTURE}
        onPressed={(gesture, _count, x, y) => {
          const inside = (rect: Rectangle) =>
            x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
          if (!inside(cardBounds)) {
            gesture.set_state(Gtk.EventSequenceState.CLAIMED)
            onClose()
          }
        }}
      />
      {fixed}
    </window>
  ) as Astal.Window
  app.add_window(window)

  function place() {
    const bar = anchor.get_root() as Astal.Window | null
    if (!bar?.gdkmonitor) return false
    const [valid, bounds] = anchor.compute_bounds(bar)
    if (!valid) return false
    const screen = bar.gdkmonitor.get_geometry()
    const anchorBounds = {
      x: bar.margin_left + bounds.get_x(),
      y: screen.height - bar.margin_bottom - bar.get_height() + bounds.get_y(),
      width: bounds.get_width(),
      height: bounds.get_height(),
    }
    window.gdkmonitor = bar.gdkmonitor
    window.name = `${name}-${bar.gdkmonitor.connector}`
    const [, width] = child.measure(Gtk.Orientation.HORIZONTAL, -1)
    const [, height] = child.measure(Gtk.Orientation.VERTICAL, width)
    // Gtk.Fixed otherwise allocates scrollable content at its minimum size.
    animated.set_size_request(width, height)
    const placement = popupPlacement(anchorBounds, width, height, screen.width, align)
    const moved = cardBounds.x !== placement.x || cardBounds.y !== placement.y
    cardBounds = { x: placement.x, y: placement.y, width, height }
    if (moved) fixed.move(animated, placement.x, placement.y)
    return true
  }

  createEffect(() => {
    const next = open() ? 1 : 0
    if (next === target) return
    if (next && !place()) {
      onClose()
      return
    }
    from = animated.progress
    target = next
    started = 0
    if (next) window.show()
    if (tick !== undefined) animated.remove_tick_callback(tick)
    tick = animated.add_tick_callback((_widget, clock) => {
      if (target) place()
      const now = clock.get_frame_time()
      if (!started) started = now
      const elapsed = Math.min(1, (now - started) / 180_000)
      const eased = 1 - (1 - elapsed) ** 3
      const progress = from + (target - from) * eased
      if (animated.progress !== progress) {
        animated.progress = progress
        animated.queue_draw()
      }
      if (elapsed < 1 || target) return true
      tick = undefined
      window.hide()
      return false
    })
  })
  onCleanup(() => {
    if (tick !== undefined) animated.remove_tick_callback(tick)
    window.destroy()
  })
  return window
}
