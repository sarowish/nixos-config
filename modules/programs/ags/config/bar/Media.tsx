import { createEffect, createState } from "ags"
import { Gtk, Gdk } from "ags/gtk4"
import type { createMpd } from "../services/mpd"
import PlayerWindow from "../player/PlayerWindow"

export default function Media({ mpd }: { mpd: ReturnType<typeof createMpd> }) {
  const [open, setOpen] = createState(false)
  createEffect(() => {
    if (!mpd.available()) setOpen(false)
  })

  return (
    <box
      class="Media"
      visible={mpd.available}
      marginStart={8}
      spacing={8}
      $={(box: Gtk.Box) => PlayerWindow({ anchor: box, mpd, open, onClose: () => setOpen(false) })}
    >
      <button class="track" focusable={false} onClicked={() => setOpen(!open())}>
        <box>
          <label
            class="artist"
            label={mpd.barTrack((track) => (track ? `${track.artist} - ` : ""))}
          />
          <label label={mpd.barTrack((track) => track?.title ?? "     ")} />
        </box>
      </button>
      <button
        class="play-pause"
        valign={Gtk.Align.CENTER}
        focusable={false}
        tooltipText={mpd.playing((playing) => (playing ? "Pause" : "Play"))}
        onClicked={() => void mpd.command("toggle")}
      >
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
