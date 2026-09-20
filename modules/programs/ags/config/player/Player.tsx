import { createComputed, createEffect, createState, onCleanup } from "ags"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import type { createMpd } from "../services/mpd"
import { formatTime, trackPosition } from "../services/mpd-state"

export default function Player({ mpd }: { mpd: ReturnType<typeof createMpd> }) {
  const [now, setNow] = createState(GLib.get_monotonic_time())
  const position = createComputed(() => {
    const track = mpd.track()
    return trackPosition(track, (now() - track.updatedAt) / 1_000_000)
  })
  let ticker: number | undefined
  let seekTimer: number | undefined
  let seeking = false
  let seekGeneration = 0
  const scale = new Gtk.Scale({
    orientation: Gtk.Orientation.HORIZONTAL,
    draw_value: false,
    hexpand: true,
    adjustment: new Gtk.Adjustment({ lower: 0, upper: 1, step_increment: 5, page_increment: 10 }),
  })
  scale.connect("change-value", (_scale, _scroll, value) => {
    if (seekTimer !== undefined) GLib.source_remove(seekTimer)
    seeking = true
    const generation = ++seekGeneration
    const file = mpd.track().file
    scale.set_value(value)
    seekTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
      seekTimer = undefined
      if (file !== mpd.track().file) {
        seeking = false
        return GLib.SOURCE_REMOVE
      }
      void mpd.seek(value).finally(() => {
        if (generation === seekGeneration) {
          seeking = false
          setNow(GLib.get_monotonic_time())
        }
      })
      return GLib.SOURCE_REMOVE
    })
    return true
  })
  createEffect(() => {
    const track = mpd.track()
    scale.set_sensitive(track.duration > 0 && track.state !== "stopped")
    scale.adjustment.upper = Math.max(1, track.duration)
    const elapsed = position()
    if (!seeking) scale.set_value(track.duration > 0 ? elapsed : 0)
  })
  function stopTimers() {
    if (ticker !== undefined) GLib.source_remove(ticker)
    if (seekTimer !== undefined) GLib.source_remove(seekTimer)
    ticker = undefined
    seekTimer = undefined
    seeking = false
  }
  onCleanup(stopTimers)

  return (
    <box
      class="player-card"
      orientation={Gtk.Orientation.VERTICAL}
      widthRequest={320}
      overflow={Gtk.Overflow.HIDDEN}
      onMap={() => {
        setNow(GLib.get_monotonic_time())
        ticker = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
          setNow(GLib.get_monotonic_time())
          return GLib.SOURCE_CONTINUE
        })
      }}
      onUnmap={stopTimers}
    >
      <box class="player-content" orientation={Gtk.Orientation.VERTICAL}>
        <overlay
          widthRequest={288}
          heightRequest={288}
          overflow={Gtk.Overflow.HIDDEN}
          class="cover"
        >
          <label label="󰝚" class="missing-cover" visible={mpd.art((art) => art === null)} />
          <Gtk.Picture
            $type="overlay"
            canShrink
            contentFit={Gtk.ContentFit.CONTAIN}
            $={(picture) => createEffect(() => picture.set_paintable(mpd.art()?.texture ?? null))}
          />
        </overlay>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={2} marginTop={16}>
          <label
            class="title"
            xalign={0}
            label={mpd.track((track) => track.title)}
            ellipsize={Pango.EllipsizeMode.END}
            wrap
            wrapMode={Pango.WrapMode.WORD_CHAR}
            lines={2}
            maxWidthChars={28}
            marginBottom={4}
            tooltipText={mpd.track((track) => track.title)}
          />
          <label
            class="artist"
            xalign={0}
            label={mpd.track((track) => track.artist)}
            ellipsize={Pango.EllipsizeMode.END}
            maxWidthChars={28}
            tooltipText={mpd.track((track) => track.artist)}
          />
          <label
            class="album"
            xalign={0}
            label={mpd.track((track) => track.album)}
            ellipsize={Pango.EllipsizeMode.END}
            maxWidthChars={28}
            tooltipText={mpd.track((track) => track.album)}
          />
        </box>
        <box orientation={Gtk.Orientation.VERTICAL} marginTop={12}>
          {scale}
          <centerbox class="times">
            <label $type="start" label={position(formatTime)} />
            <label $type="end" label={mpd.track((track) => formatTime(track.duration))} />
          </centerbox>
        </box>
        <box
          class="transport"
          halign={Gtk.Align.CENTER}
          spacing={20}
          marginTop={14}
          sensitive={mpd.available}
        >
          <button tooltipText="Previous" onClicked={() => void mpd.command("cdprev")}>
            <image iconName="media-skip-backward-symbolic" />
          </button>
          <button
            class="play"
            tooltipText={mpd.track((track) => (track.state === "playing" ? "Pause" : "Play"))}
            onClicked={() => void mpd.command("toggle")}
          >
            <image
              iconName={mpd.track((track) =>
                track.state === "playing"
                  ? "media-playback-pause-symbolic"
                  : "media-playback-start-symbolic",
              )}
            />
          </button>
          <button tooltipText="Next" onClicked={() => void mpd.command("next")}>
            <image iconName="media-skip-forward-symbolic" />
          </button>
        </box>
      </box>
    </box>
  ) as Gtk.Box
}
