import { createComputed, onCleanup } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import Cairo from "cairo"
import type { createNiri } from "../services/niri"
import type { createVolumeOsd } from "../services/volume-osd"
import VolumeTrack, { TRACK_HEIGHT } from "./VolumeTrack"
import SinkPanel from "./SinkPanel"

export default function VolumeOsd({
  monitor,
  niri,
  volumeOsd,
}: {
  monitor: Gdk.Monitor
  niri: ReturnType<typeof createNiri>
  volumeOsd: ReturnType<typeof createVolumeOsd>
}) {
  const output = monitor.connector ?? ""
  const focused = niri.state(({ workspaces }) =>
    workspaces.some((workspace) => workspace.output === output && workspace.is_focused),
  )

  return (
    <window
      name={`volume-osd-${monitor.connector}`}
      namespace="ags-volume-osd"
      class="VolumeOsd"
      visible={createComputed(() => focused() && volumeOsd.barOutput() === null)}
      gdkmonitor={monitor}
      anchor={Astal.WindowAnchor.RIGHT}
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.NONE}
      marginRight={0}
      $={(window: Astal.Window) => {
        const makeClickThrough = () => window.get_surface()?.set_input_region(new Cairo.Region())
        const realized = window.connect("realize", makeClickThrough)

        makeClickThrough()
        onCleanup(() => {
          window.disconnect(realized)
          window.destroy()
        })
      }}
    >
      <overlay widthRequest={320} heightRequest={TRACK_HEIGHT + 24} overflow={Gtk.Overflow.HIDDEN}>
        <box />
        <revealer
          $type="overlay"
          revealChild={createComputed(() => volumeOsd.visible() && volumeOsd.barOutput() === null)}
          transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
          transitionDuration={220}
          halign={Gtk.Align.END}
          valign={Gtk.Align.FILL}
        >
          <box
            class="content"
            halign={Gtk.Align.END}
            valign={Gtk.Align.CENTER}
            spacing={12}
            marginEnd={12}
          >
            <SinkPanel volumeOsd={volumeOsd} />
            <box visible={volumeOsd.mode.as((mode) => mode !== "sink-only")}>
              <VolumeTrack volumeOsd={volumeOsd} />
            </box>
          </box>
        </revealer>
      </overlay>
    </window>
  ) as Astal.Window
}
