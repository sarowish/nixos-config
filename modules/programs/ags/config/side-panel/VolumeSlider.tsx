import { createEffect, onCleanup, type Accessor } from "ags"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import type Cairo from "cairo"
import { volumeSegments } from "./volume-segments"

type Color = [number, number, number, number]

function color(widget: Gtk.Widget): Color {
  const value = widget.get_color()
  return [value.red, value.green, value.blue, value.alpha]
}

function mix(a: Color, b: Color, amount: number): Color {
  return a.map((value, index) => value + (b[index] - value) * amount) as Color
}

function roundedRectangle(
  cr: Cairo.Context,
  x: number,
  y: number,
  width: number,
  height: number,
  rightRadius: number,
  leftRadius = 11,
) {
  const left = Math.min(leftRadius, width / 2, height / 2)
  const right = Math.min(rightRadius, width / 2, height / 2)
  cr.newPath()
  cr.arc(x + left, y + left, left, Math.PI, Math.PI * 1.5)
  cr.arc(x + width - right, y + right, right, Math.PI * 1.5, Math.PI * 2)
  cr.arc(x + width - right, y + height - right, right, 0, Math.PI / 2)
  cr.arc(x + left, y + height - left, left, Math.PI / 2, Math.PI)
  cr.closePath()
}

export default function VolumeSlider({
  volume,
  mute,
  onChange,
}: {
  volume: Accessor<number>
  mute: Accessor<boolean>
  onChange: (value: number) => void
}) {
  const scale = new Gtk.Scale({
    css_classes: ["volume-slider"],
    orientation: Gtk.Orientation.HORIZONTAL,
    draw_value: false,
    has_origin: false,
    hexpand: true,
    tooltip_text: "Volume · 0–150%",
    adjustment: new Gtk.Adjustment({
      lower: 0,
      upper: 1.5,
      step_increment: 0.01,
      page_increment: 0.05,
    }),
  })
  // GTK supplies magnetic dragging and stops coarse keyboard steps at 100%.
  // Its visual marker is hidden; the painted split is the only cutoff indicator.
  scale.add_mark(1, Gtk.PositionType.BOTTOM, null)
  scale.update_property([Gtk.AccessibleProperty.LABEL], ["Volume"])
  const drawings = (["normal", "boost"] as const).map((kind) => {
    const drawing = new Gtk.DrawingArea({
      css_classes: ["volume-paint", `volume-paint-${kind}`],
      can_target: false,
      accessible_role: Gtk.AccessibleRole.PRESENTATION,
    })
    return { kind, drawing }
  })
  const redraw = () => drawings.forEach(({ drawing }) => drawing.queue_draw())
  let hover = 0
  let from = 0
  let target = 0
  let started = 0
  let tick: number | undefined

  for (const { kind, drawing } of drawings)
    drawing.set_draw_func((widget, cr, _width, height) => {
      const bounds = scale.get_range_rect()
      if (bounds.width <= 0) return
      const y = (height - 22) / 2
      const foreground = color(scale)
      const track: Color = [...foreground.slice(0, 3), foreground[3] * 0.08] as Color
      const muted: Color = [...foreground.slice(0, 3), foreground[3] * 0.25] as Color
      const value = scale.get_value()
      const segment = volumeSegments(bounds.width, value)[kind]
      if (segment.width <= 0) return
      const x = bounds.x + segment.x
      const leftRadius = kind === "boost" ? 8 : 11
      const rightRadius = kind === "normal" ? 8 : 11
      roundedRectangle(cr, x, y, segment.width, 22, rightRadius, leftRadius)
      cr.setSourceRGBA(...track)
      cr.fill()
      if (segment.filled <= 0) return
      const activeHover = segment.active ? hover : 0
      const fill = mute.peek() ? muted : color(widget)
      const fillRadius =
        kind === "normal" && segment.filled === segment.width ? 8 : 11 - activeHover * 7
      roundedRectangle(cr, x, y, segment.filled, 22, fillRadius, leftRadius)
      cr.setSourceRGBA(...fill)
      cr.fillPreserve()
      if (!activeHover) {
        cr.newPath()
        return
      }
      cr.save()
      cr.clip()
      const capWidth = Math.min(segment.filled, 16 + activeHover * 4)
      cr.rectangle(x + segment.filled - capWidth, y, capWidth, 22)
      cr.setSourceRGBA(...mix(fill, foreground, activeHover * 0.35))
      cr.fill()
      cr.restore()
    })

  function stopAnimation() {
    if (tick !== undefined) scale.remove_tick_callback(tick)
    tick = undefined
  }
  function updateHover() {
    const flags = scale.get_state_flags()
    const next =
      scale.is_sensitive() &&
      flags & (Gtk.StateFlags.PRELIGHT | Gtk.StateFlags.FOCUS_VISIBLE | Gtk.StateFlags.ACTIVE)
        ? 1
        : 0
    if (next === target) return
    from = hover
    target = next
    started = GLib.get_monotonic_time()
    if (!scale.get_mapped() || !Gtk.Settings.get_default()?.gtk_enable_animations) {
      stopAnimation()
      hover = target
      redraw()
      return
    }
    if (tick !== undefined) return
    tick = scale.add_tick_callback((_widget, clock) => {
      const elapsed = Math.max(0, Math.min(1, (clock.get_frame_time() - started) / 130_000))
      hover = from + (target - from) * (1 - (1 - elapsed) ** 3)
      redraw()
      if (elapsed < 1) return true
      tick = undefined
      return false
    })
  }
  const stateChanged = scale.connect("state-flags-changed", updateHover)
  const unmapped = scale.connect("unmap", () => {
    stopAnimation()
    hover = target = 0
    redraw()
  })
  const changed = scale.connect("change-value", (_scale, _scroll, value) => {
    onChange(Math.max(0, Math.min(1.5, value)))
    return true
  })
  createEffect(() => {
    scale.set_value(volume())
    mute()
    redraw()
  })
  onCleanup(() => {
    stopAnimation()
    scale.disconnect(stateChanged)
    scale.disconnect(unmapped)
    scale.disconnect(changed)
    drawings.forEach(({ drawing }) => drawing.set_draw_func(null))
  })

  const overlay = new Gtk.Overlay({ hexpand: true, child: scale })
  drawings.forEach(({ drawing }) => overlay.add_overlay(drawing))
  return overlay
}
