import { createComputed } from "ags"
import { Gtk } from "ags/gtk4"
import type { createVolumeOsd } from "../services/volume-osd"
import PopupWindow, { above, barBounds } from "../widgets/PopupWindow"
import type { Rectangle } from "../widgets/popup-placement"
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
  const open = createComputed(() => volumeOsd.visible() && volumeOsd.barOutput() === output)
  const showSink = createComputed(() => open() && volumeOsd.mode() !== "volume")
  const showTrack = createComputed(() => open() && volumeOsd.mode() !== "sink-only")
  const sink = SinkPanel({ volumeOsd, visible: true })
  let visibleCards = 0
  let anchorBounds: Rectangle | undefined
  // Keep both panels at the same point while percentage changes resize the bar button.
  const bounds = () => (anchorBounds ??= barBounds(parent))
  const onVisibilityChanged = (visible: boolean) => {
    visibleCards += visible ? 1 : -1
    if (visibleCards === 0) anchorBounds = undefined
    volumeOsd.setBarPopoverVisible(output, visibleCards > 0)
  }
  const sinkWindow = PopupWindow({
    place: above(parent, { bounds, offset: () => 12 }),
    child: sink,
    open: showSink,
    name: "volume-sink",
    className: "VolumePopover",
    passive: true,
    onVisibilityChanged,
  })
  let sinkShift = 0
  PopupWindow({
    place: above(parent, {
      bounds,
      offset: () => {
        // Hold the track still while it closes so it fades where it was.
        if (showTrack()) {
          const [, width] = sink.measure(Gtk.Orientation.HORIZONTAL, -1)
          const [, height] = sink.measure(Gtk.Orientation.VERTICAL, width)
          sinkShift = (height + 12) * sinkWindow.progress()
        }
        return 12 + sinkShift
      },
    }),
    child: VolumeTrack({ volumeOsd }),
    open: showTrack,
    name: "volume-track",
    className: "VolumePopover",
    passive: true,
    onVisibilityChanged,
  })
}
