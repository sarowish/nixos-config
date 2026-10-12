import { Gtk } from "ags/gtk4"
import Pango from "gi://Pango?version=1.0"
import type { createVolumeOsd } from "../services/volume-osd"

export default function SinkPanel({
  volumeOsd,
  visible,
}: {
  volumeOsd: ReturnType<typeof createVolumeOsd>
  visible?: boolean
}) {
  return (
    <box
      class="sink-panel"
      visible={visible ?? volumeOsd.mode.as((mode) => mode !== "volume")}
      orientation={Gtk.Orientation.VERTICAL}
      valign={Gtk.Align.CENTER}
      spacing={6}
      widthRequest={190}
    >
      <label class="sink-icon" label="󰓃" />
      <label
        class="sink-name"
        label={volumeOsd.description.as((description) => description ?? "Unknown output")}
        ellipsize={Pango.EllipsizeMode.END}
        maxWidthChars={22}
        singleLineMode
      />
    </box>
  ) as Gtk.Box
}
