import { createEffect, onCleanup } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import Cairo from "cairo"
import type { createVolumeOsd } from "../services/volume-osd"
import VolumeTrack from "./VolumeTrack"
import SinkPanel from "./SinkPanel"

export default function VolumePopover({
  parent,
  output,
  volumeOsd,
}: {
  parent: Gtk.Widget
  output: string
  volumeOsd: ReturnType<typeof createVolumeOsd>
}) {
  const trackRevealer = new Gtk.Revealer({
    transition_type: Gtk.RevealerTransitionType.CROSSFADE,
    transition_duration: 180,
    halign: Gtk.Align.CENTER,
    child: VolumeTrack({ volumeOsd }),
  })
  const outputRevealer = new Gtk.Revealer({
    transition_type: Gtk.RevealerTransitionType.SLIDE_UP,
    transition_duration: 180,
    child: (
      <box marginTop={volumeOsd.mode.as((mode) => (mode === "sink-only" ? 0 : 12))}>
        <SinkPanel volumeOsd={volumeOsd} visible />
      </box>
    ) as Gtk.Box,
  })
  const revealer = new Gtk.Revealer({
    transition_type: Gtk.RevealerTransitionType.CROSSFADE,
    transition_duration: 180,
    // Keep the minimum height stable while Wayland applies animated size requests.
    child: new Gtk.ScrolledWindow({
      hscrollbar_policy: Gtk.PolicyType.NEVER,
      vscrollbar_policy: Gtk.PolicyType.EXTERNAL,
      propagate_natural_height: true,
      kinetic_scrolling: false,
      child: new Gtk.Viewport({
        overflow: Gtk.Overflow.VISIBLE,
        child: (
          <box orientation={Gtk.Orientation.VERTICAL}>
            {trackRevealer}
            {outputRevealer}
          </box>
        ) as Gtk.Box,
      }),
    }),
  })
  const popup = new Gtk.Popover({
    css_classes: ["VolumePopover"],
    position: Gtk.PositionType.TOP,
    has_arrow: false,
    autohide: false,
    can_target: false,
    focusable: false,
    child: revealer,
  })
  popup.set_offset(0, 8)
  popup.set_parent(parent)

  const makeClickThrough = () => popup.get_surface()?.set_input_region(new Cairo.Region())
  let disconnectLayout: (() => void) | undefined
  const realized = popup.connect_after("realize", () => {
    const surface = popup.get_surface()!
    const layout = surface.connect_after("layout", makeClickThrough)
    disconnectLayout?.()
    disconnectLayout = () => surface.disconnect(layout)
    makeClickThrough()
  })
  const mapped = popup.connect_after("map", () => {
    makeClickThrough()
    volumeOsd.setBarPopoverVisible(output, true)
  })

  let positioned = false
  function positionPopup() {
    if (!positioned) {
      const root = parent.get_root() as Gtk.Widget | null
      if (!root) return
      const [valid, bounds] = parent.compute_bounds(root)
      if (!valid) return
      // Anchor to the bar so changing widget allocations cannot move the popup.
      if (popup.get_parent() !== root) {
        popup.unparent()
        popup.set_parent(root)
      }
      popup.set_pointing_to(
        new Gdk.Rectangle({
          x: Math.round(bounds.get_x()),
          y: Math.round(bounds.get_y()),
          width: Math.round(bounds.get_width()),
          height: Math.round(bounds.get_height()),
        }),
      )
      positioned = true
    }
    // Refresh the surface size as the output revealer changes the natural height.
    popup.queue_resize()
    popup.present()
  }

  let tickId: number | undefined
  const unmapped = popup.connect_after("unmap", () => {
    if (tickId !== undefined) parent.remove_tick_callback(tickId)
    tickId = undefined
    positioned = false
    volumeOsd.setBarPopoverVisible(output, false)
  })
  const revealed = revealer.connect("notify::child-revealed", () => {
    if (!revealer.get_reveal_child() && !revealer.get_child_revealed()) popup.popdown()
  })
  createEffect(() => {
    const showTrack = volumeOsd.mode() !== "sink-only"
    trackRevealer.set_visible(showTrack)
    trackRevealer.set_reveal_child(showTrack)
    outputRevealer.set_reveal_child(volumeOsd.mode() !== "volume")
    if (volumeOsd.visible() && volumeOsd.barOutput() === output) {
      positionPopup()
      popup.popup()
      revealer.set_reveal_child(true)
      if (tickId === undefined)
        tickId = parent.add_tick_callback(() => {
          positionPopup()
          return true
        })
    } else revealer.set_reveal_child(false)
  })
  onCleanup(() => {
    if (tickId !== undefined) parent.remove_tick_callback(tickId)
    popup.disconnect(realized)
    popup.disconnect(mapped)
    popup.disconnect(unmapped)
    revealer.disconnect(revealed)
    disconnectLayout?.()
    volumeOsd.setBarPopoverVisible(output, false)
    popup.unparent()
  })
  return popup
}
