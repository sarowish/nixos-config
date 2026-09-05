import { Gtk, Gdk } from "ags/gtk4"
import type { createMpd } from "../services/mpd"

export default function Media({ mpd }: { mpd: ReturnType<typeof createMpd> }) {
  return (
    <button
      class="Media"
      visible={mpd.available}
      focusable={false}
      onClicked={() => void mpd.command("toggle")}
    >
      <Gtk.GestureClick button={Gdk.BUTTON_MIDDLE} onReleased={() => void mpd.command("next")} />
      <Gtk.GestureClick
        button={Gdk.BUTTON_SECONDARY}
        onReleased={() => void mpd.command("cdprev")}
      />
      <label label={mpd.label} />
    </button>
  )
}
