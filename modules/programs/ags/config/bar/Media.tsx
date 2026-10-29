import { Gtk, Gdk } from "ags/gtk4"
import type { createMpd } from "../services/mpd"

export default function Media({ mpd }: { mpd: ReturnType<typeof createMpd> }) {
  return (
    <box class="Media" visible={mpd.available} marginStart={8} spacing={8}>
      <box>
        <label class="artist" label={mpd.track((track) => (track ? `${track.artist} - ` : ""))} />
        <label label={mpd.track((track) => track?.title ?? "     ")} />
      </box>
      <button
        class="play-pause"
        valign={Gtk.Align.CENTER}
        focusable={false}
        tooltipText={mpd.playing((playing) => (playing ? "Pause" : "Play"))}
        onClicked={() => void mpd.command("toggle")}
      >
        <Gtk.GestureClick button={Gdk.BUTTON_MIDDLE} onReleased={() => void mpd.command("next")} />
        <Gtk.GestureClick
          button={Gdk.BUTTON_SECONDARY}
          onReleased={() => void mpd.command("cdprev")}
        />
        <image
          iconName={mpd.playing((playing) =>
            playing ? "media-playback-pause-symbolic" : "media-playback-start-symbolic",
          )}
          pixelSize={14}
        />
      </button>
    </box>
  )
}
