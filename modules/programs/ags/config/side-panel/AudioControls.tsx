import { createBinding, createComputed, createEffect, createState, For } from "ags"
import { Gtk } from "ags/gtk4"
import Wp from "gi://AstalWp?version=0.1"
import Pango from "gi://Pango?version=1.0"
import VolumeSlider from "./VolumeSlider"

export default function AudioControls() {
  const wp = Wp.get_default()!
  const audio = wp.audio
  const speaker = audio.default_speaker
  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")
  const speakers = createBinding(audio, "speakers")
  const currentOutputId = createBinding(speaker, "id")
  const alternativeOutputs = createComputed(() =>
    [...(speakers() ?? [])]
      .filter((endpoint) => endpoint.id !== currentOutputId())
      .sort((a, b) => a.id - b.id),
  )
  const available = createComputed(() => (speakers()?.length ?? 0) > 0)
  const multipleOutputs = createComputed(() => (speakers()?.length ?? 0) > 1)
  const [choosingOutput, setChoosingOutput] = createState(false)
  createEffect(() => {
    if (!multipleOutputs()) setChoosingOutput(false)
  })

  return (
    <box
      class={createComputed(
        () =>
          `panel-card audio-card${mute() ? " muted-audio" : ""}${volume() > 1 ? " boosted-audio" : ""}`,
      )}
      orientation={Gtk.Orientation.VERTICAL}
      spacing={14}
      onUnmap={() => setChoosingOutput(false)}
    >
      <box spacing={12} sensitive={available}>
        <button
          class="mute-button"
          tooltipText={mute((value) => (value ? "Unmute" : "Mute"))}
          onClicked={() => (speaker.mute = !speaker.mute)}
        >
          <image
            pixelSize={20}
            iconName={createComputed(() =>
              mute()
                ? "audio-volume-muted-symbolic"
                : volume() > 0.66
                  ? "audio-volume-high-symbolic"
                  : "audio-volume-low-symbolic",
            )}
          />
        </button>
        <label class="section-title" xalign={0} hexpand label="Sound" />
        <label
          class="volume-value"
          xalign={1}
          label={createComputed(() => (mute() ? "Muted" : `${Math.round(volume() * 100)}%`))}
        />
      </box>
      <box sensitive={available}>
        <VolumeSlider volume={volume} mute={mute} onChange={(value) => (speaker.volume = value)} />
      </box>
      <label
        class="muted"
        xalign={0}
        visible={available((value) => !value)}
        label="No audio outputs available"
      />
      <box
        class={choosingOutput((value) => (value ? "output-picker expanded" : "output-picker"))}
        orientation={Gtk.Orientation.VERTICAL}
        visible={available}
      >
        <button
          class="output-selector"
          sensitive={multipleOutputs}
          tooltipText={multipleOutputs((value) => (value ? "Choose audio output" : "Audio output"))}
          onClicked={() => setChoosingOutput(!choosingOutput.peek())}
        >
          <box spacing={10}>
            <image iconName="audio-speakers-symbolic" pixelSize={16} />
            <label
              xalign={0}
              hexpand
              ellipsize={Pango.EllipsizeMode.END}
              label={createBinding(speaker, "description")((value) => value ?? "Audio output")}
            />
            <image iconName="object-select-symbolic" pixelSize={14} visible={choosingOutput} />
            <image
              iconName={choosingOutput((value) =>
                value ? "pan-up-symbolic" : "pan-down-symbolic",
              )}
              pixelSize={12}
              visible={multipleOutputs}
            />
          </box>
        </button>
        <revealer
          revealChild={choosingOutput}
          transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
          transitionDuration={160}
        >
          <box class="audio-outputs" orientation={Gtk.Orientation.VERTICAL} spacing={2}>
            <For each={alternativeOutputs}>
              {(endpoint: Wp.Endpoint) => (
                <button
                  class="output-row"
                  onClicked={() => {
                    endpoint.is_default = true
                    setChoosingOutput(false)
                  }}
                >
                  <box spacing={10}>
                    <image iconName="audio-speakers-symbolic" pixelSize={16} />
                    <label
                      xalign={0}
                      hexpand
                      ellipsize={Pango.EllipsizeMode.END}
                      label={createBinding(
                        endpoint,
                        "description",
                      )((value) => value ?? "Audio output")}
                    />
                  </box>
                </button>
              )}
            </For>
          </box>
        </revealer>
      </box>
    </box>
  )
}
