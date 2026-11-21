import { createComputed, createEffect, createState, This } from "ags"
import { Gtk, Gdk } from "ags/gtk4"
import type { createMpd } from "../services/mpd"
import PlayerWindow from "../player/PlayerWindow"

export default function Media({ mpd }: { mpd: ReturnType<typeof createMpd> }) {
  const [open, setOpen] = createState(false)
  createEffect(() => {
    if (!mpd.available()) setOpen(false)
  })

  const progress = createComputed(() => {
    const track = mpd.track()
    if (track.state === "stopped" || track.duration <= 0) return null
    return mpd.position() / track.duration
  })
  const dot = new Gtk.DrawingArea({
    can_target: false,
    css_classes: ["playback-dot"],
  })
  dot.set_draw_func((widget, cr, width, height) => {
    const fraction = progress.peek()
    if (fraction === null) return

    // Leave a gap at the top so the start and end have distinct positions.
    const gap = Math.PI / 18
    const angle = -Math.PI / 2 + gap + fraction * (2 * Math.PI - 2 * gap)
    const x = width / 2 + (width / 2 - 3) * Math.cos(angle)
    const y = height / 2 + (height / 2 - 3) * Math.sin(angle)
    const color = widget.get_color()
    const [hasBackground, background] = widget.get_style_context().lookup_color("background")
    cr.arc(x, y, 1.5, 0, 2 * Math.PI)
    if (hasBackground) {
      cr.setLineWidth(2)
      cr.setSourceRGBA(background.red, background.green, background.blue, background.alpha)
      cr.strokePreserve()
    }
    cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha)
    cr.fill()
  })
  createEffect(() => {
    progress()
    dot.queue_draw()
  })

  return (
    <box
      class="Media"
      visible={mpd.available}
      marginStart={8}
      spacing={4}
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
      <overlay valign={Gtk.Align.CENTER}>
        <button
          class="play-pause"
          marginStart={4}
          marginEnd={4}
          marginTop={4}
          marginBottom={4}
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
        <This this={dot} $type="overlay" />
      </overlay>
    </box>
  )
}
