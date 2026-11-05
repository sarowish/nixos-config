import { createComputed } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import type { createVolumeOsd } from "../services/volume-osd"
import PopupWindow from "../widgets/PopupWindow"
import VolumeTrack from "./VolumeTrack"
import SinkPanel from "./SinkPanel"

export default function VolumeOsd({
  monitor,
  volumeOsd,
}: {
  monitor: Gdk.Monitor
  volumeOsd: ReturnType<typeof createVolumeOsd>
}) {
  const open = createComputed(() => volumeOsd.visible() && volumeOsd.barOutput() === null)
  const track = VolumeTrack({ volumeOsd })
  const sink = SinkPanel({ volumeOsd, visible: true })
  const hasTrack = () => volumeOsd.mode() !== "sink-only"
  const hasSink = () => volumeOsd.mode() !== "volume"

  for (const [panel, child, visible] of [
    ["track", track, hasTrack],
    ["sink", sink, hasSink],
  ] as const) {
    PopupWindow({
      child,
      open: createComputed(() => open() && visible()),
      name: `volume-osd-${panel}`,
      className: "VolumeOsd",
      passive: true,
      duration: 220,
      fade: false,
      edge: "right",
      place: (width, height, progress) => {
        const screen = monitor.get_geometry()
        const trackWidth = hasTrack() ? track.measure(Gtk.Orientation.HORIZONTAL, -1)[1] : 0
        const sinkWidth = hasSink() ? sink.measure(Gtk.Orientation.HORIZONTAL, -1)[1] : 0
        const gap = hasTrack() && hasSink() ? 12 : 0
        const groupWidth = trackWidth + sinkWidth + gap
        const right = 12 + (panel === "sink" ? trackWidth + gap : 0)
        return {
          monitor,
          x: screen.width - right - width + (groupWidth + 12) * (1 - progress),
          y: (screen.height - height) / 2,
        }
      },
    })
  }
}
