import app from "ags/gtk4/app"
import { createEffect, onCleanup, type Accessor } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import Cairo from "cairo"
import { popupPlacement, type Rectangle } from "./popup-placement"

// Places the card in output coordinates for the given animation progress.
export type Place = (
  width: number,
  height: number,
  progress: number,
) => { monitor: Gdk.Monitor; x: number; y: number } | undefined

// Bounds of a bar widget in its output's coordinates.
export function barBounds(widget: Gtk.Widget): Rectangle | undefined {
  const bar = widget.get_root() as Astal.Window | null
  if (!bar?.gdkmonitor) return
  const [valid, bounds] = widget.compute_bounds(bar)
  if (!valid) return
  return {
    x: bar.margin_left + bounds.get_x(),
    y: bar.gdkmonitor.get_geometry().height - bar.margin_bottom - bar.get_height() + bounds.get_y(),
    width: bounds.get_width(),
    height: bounds.get_height(),
  }
}

// Places the card above a bar widget, rising into place as it opens.
export function above(
  anchor: Gtk.Widget,
  {
    align = "center",
    offset = () => 0,
    bounds = () => barBounds(anchor),
  }: {
    align?: "start" | "center"
    offset?: () => number
    bounds?: () => Rectangle | undefined
  } = {},
): Place {
  return (width, height, progress) => {
    const monitor = (anchor.get_root() as Astal.Window | null)?.gdkmonitor
    const anchorBounds = bounds()
    if (!monitor || !anchorBounds) return
    const { x, y } = popupPlacement(
      { ...anchorBounds, y: anchorBounds.y - offset() },
      width,
      height,
      monitor.get_geometry().width,
      align,
    )
    return { monitor, x, y: y + 6 * (1 - progress) }
  }
}

export default function PopupWindow({
  place,
  edge = "left",
  child,
  open,
  onClose,
  name,
  className,
  passive = false,
  onVisibilityChanged,
  duration = 180,
  fade = true,
}: {
  place: Place
  // The output edge the window stays attached to while its size changes.
  edge?: "left" | "right"
  child: Gtk.Widget
  open: Accessor<boolean>
  onClose?: () => void
  name: string
  className: string
  passive?: boolean
  onVisibilityChanged?: (visible: boolean) => void
  duration?: number
  fade?: boolean
}) {
  let tick: { widget: Gtk.Widget; id: number } | undefined
  let progress = 0
  let from = 0
  let target = 0
  let started = 0
  let cardX = 0
  let cardY = 0
  let cardWidth = 0
  let cardHeight = 0
  let cancelHandoff: (() => void) | undefined
  const closingCard = new Gtk.Picture({ visible: false, can_target: false })
  const backdropContent = new Gtk.Fixed()
  backdropContent.put(closingCard, 0, 0)
  // Sliding snapshots may extend beyond the output without enlarging the window.
  const backdropLayout = new Gtk.Overlay()
  backdropLayout.add_overlay(backdropContent)
  backdropLayout.set_clip_overlay(backdropContent, true)
  // Keep the outside-click catcher separate so blur only covers the card.
  const backdrop = (
    <window
      namespace="ags-popup-backdrop"
      class={passive ? "PopupBackdrop passive" : "PopupBackdrop"}
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.NONE}
      anchor={
        Astal.WindowAnchor.TOP |
        Astal.WindowAnchor.BOTTOM |
        Astal.WindowAnchor.LEFT |
        Astal.WindowAnchor.RIGHT
      }
    >
      {!passive && (
        <Gtk.GestureClick
          button={0}
          propagationPhase={Gtk.PropagationPhase.CAPTURE}
          onPressed={(gesture) => {
            gesture.set_state(Gtk.EventSequenceState.CLAIMED)
            onClose?.()
          }}
        />
      )}
      {backdropLayout}
    </window>
  ) as Astal.Window
  const window = (
    <window
      namespace={`ags-${name}`}
      class={className}
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={passive ? Astal.Keymode.NONE : Astal.Keymode.EXCLUSIVE}
      anchor={
        Astal.WindowAnchor.TOP |
        (edge === "right" ? Astal.WindowAnchor.RIGHT : Astal.WindowAnchor.LEFT)
      }
      opacity={0}
    >
      {!passive && (
        <Gtk.EventControllerKey
          onKeyPressed={(_controller, key) => {
            if (key !== Gdk.KEY_Escape) return false
            onClose?.()
            return true
          }}
        />
      )}
      {child}
    </window>
  ) as Astal.Window
  app.add_window(backdrop)
  app.add_window(window)
  if (passive) {
    for (const popup of [window, backdrop]) {
      let disconnectLayout: (() => void) | undefined
      const makeClickThrough = () => popup.get_surface()?.set_input_region(new Cairo.Region())
      const realized = popup.connect_after("realize", () => {
        disconnectLayout?.()
        const surface = popup.get_surface()!
        const layout = surface.connect_after("layout", makeClickThrough)
        disconnectLayout = () => surface.disconnect(layout)
        makeClickThrough()
      })
      const mapped = popup.connect_after("map", makeClickThrough)
      onCleanup(() => {
        popup.disconnect(realized)
        popup.disconnect(mapped)
        disconnectLayout?.()
      })
    }
  }

  function layout() {
    const [, width] = child.measure(Gtk.Orientation.HORIZONTAL, -1)
    const [, height] = child.measure(Gtk.Orientation.VERTICAL, width)
    const placement = place(width, height, progress)
    if (!placement) return false
    const { monitor } = placement
    window.gdkmonitor = monitor
    backdrop.gdkmonitor = monitor
    window.name = `${name}-${monitor.connector}`
    backdrop.name = `${name}-backdrop-${monitor.connector}`
    window.set_size_request(width, height)
    cardWidth = width
    cardHeight = height
    cardX = placement.x
    cardY = placement.y
    // Keep one column onscreen so Wayland continues sending frame callbacks.
    // A negative margin preserves the card's width while it slides offscreen.
    const screen = monitor.get_geometry()
    if (edge === "right")
      window.margin_right = Math.max(1 - width, Math.round(screen.width - cardX - width))
    else window.margin_left = Math.max(1 - width, Math.round(cardX))
    window.margin_top = Math.round(cardY)
    return true
  }

  // Blur follows the surface, so slides can animate the real window. Fades
  // need the snapshot handoff because GTK opacity cannot fade compositor blur.
  const handoff = fade
  let shown = false
  createEffect(() => {
    const next = open() ? 1 : 0
    if (next === target) return
    if (next && !layout()) {
      onClose?.()
      return
    }
    cancelHandoff?.()
    cancelHandoff = undefined
    from = progress
    target = next
    started = 0
    if (next) {
      closingCard.set_visible(false)
      closingCard.paintable = null
      window.opacity = fade ? progress : 1
      if (!shown) {
        shown = true
        onVisibilityChanged?.(true)
      }
      if (handoff || !passive) backdrop.set_visible(true)
      window.set_visible(true)
    } else if (handoff) {
      // Paint the closing snapshot before unmapping the blurred window so the
      // handoff has no empty frame.
      closingCard.paintable = new Gtk.WidgetPaintable({ widget: window }).get_current_image()
      closingCard.set_size_request(window.get_width(), window.get_height())
      closingCard.opacity = 1
      backdropContent.move(closingCard, cardX, cardY)
      closingCard.set_visible(true)
      const clock = backdrop.get_frame_clock()!
      const afterPaint = clock.connect_after("after-paint", () => {
        cancelHandoff?.()
        cancelHandoff = undefined
        window.set_visible(false)
      })
      cancelHandoff = () => clock.disconnect(afterPaint)
    }
    if (tick !== undefined) tick.widget.remove_tick_callback(tick.id)
    const ticker = next || !handoff ? window : backdrop
    const id = ticker.add_tick_callback((_widget, clock) => {
      const now = clock.get_frame_time()
      if (!started) started = now
      const elapsed = Math.min(1, (now - started) / (duration * 1000))
      const eased = 1 - (1 - elapsed) ** 3
      progress = from + (target - from) * eased
      if (target || !handoff) {
        window.opacity = fade ? progress : 1
        layout()
      } else {
        closingCard.opacity = from > 0 ? progress / from : 0
        const placement = place(cardWidth, cardHeight, progress)
        if (placement) backdropContent.move(closingCard, placement.x, placement.y)
      }
      if (elapsed < 1 || target) return true
      tick = undefined
      closingCard.set_visible(false)
      closingCard.paintable = null
      window.set_visible(false)
      backdrop.set_visible(false)
      shown = false
      onVisibilityChanged?.(false)
      return false
    })
    tick = { widget: ticker, id }
  })
  onCleanup(() => {
    cancelHandoff?.()
    if (shown) onVisibilityChanged?.(false)
    if (tick !== undefined) tick.widget.remove_tick_callback(tick.id)
    window.destroy()
    backdrop.destroy()
  })
  return { window, progress: () => progress }
}
