import { createBinding, createComputed, createState, onCleanup } from "ags"
import { Gtk, Gdk } from "ags/gtk4"
import Wp from "gi://AstalWp?version=0.1"
import VolumePopover from "../osd/VolumePopover"
import type { createVolumeOsd } from "../services/volume-osd"

export default function Volume({
  output,
  volumeOsd,
}: {
  output: string
  volumeOsd: ReturnType<typeof createVolumeOsd>
}) {
  const wp = Wp.get_default()!
  const audio = wp.audio
  const speaker = audio.default_speaker
  const [available, setAvailable] = createState(false)
  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")
  const icon = volume((value) => ["", "", ""][Math.min(2, Math.floor(value * 3))])

  function updateAvailability() {
    setAvailable((audio.speakers?.length ?? 0) > 0)
  }
  const speakersChanged = audio.connect("notify::speakers", updateAvailability)
  const connectionChanged = wp.connect("notify::connected", updateAvailability)
  onCleanup(() => {
    audio.disconnect(speakersChanged)
    wp.disconnect(connectionChanged)
  })
  updateAvailability()

  function cycleSpeaker() {
    const speakers = [...(audio.speakers ?? [])].sort((a, b) => a.id - b.id)
    if (speakers.length < 2) return

    const current = speakers.findIndex((endpoint) => endpoint.is_default)
    if (current >= 0)
      volumeOsd.selectSpeakerFromBar(speakers[(current + 1) % speakers.length], output)
  }

  return (
    <button
      class="Volume"
      visible={available}
      focusable={false}
      $={(parent: Gtk.Button) => {
        VolumePopover({ parent, output, volumeOsd })
      }}
      onClicked={() => volumeOsd.toggleMuteFromBar()}
    >
      <Gtk.GestureClick button={Gdk.BUTTON_SECONDARY} onReleased={cycleSpeaker} />
      <Gtk.EventControllerScroll
        flags={Gtk.EventControllerScrollFlags.VERTICAL | Gtk.EventControllerScrollFlags.DISCRETE}
        onScroll={(_, _dx, dy) => {
          if (dy) volumeOsd.changeVolumeFromBar(dy < 0 ? 0.05 : -0.05, output)
          return true
        }}
      />
      <box spacing={4}>
        <label
          class={mute((muted) => (muted ? "status-icon" : "status-icon accent"))}
          label={createComputed(() => (mute() ? "" : icon()))}
        />
        <label
          label={createComputed(() => (mute() ? "muted" : `${Math.round(volume() * 100)}%`))}
        />
      </box>
    </button>
  )
}
