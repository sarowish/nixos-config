import { createBinding, createState, onCleanup } from "ags"
import { timeout, type Timer } from "ags/time"
import Wp from "gi://AstalWp?version=0.1"
import GLib from "gi://GLib?version=2.0"

const VOLUME_VISIBLE_FOR_MS = 2000
const SINK_VISIBLE_FOR_MS = 2000
const SINK_PRIORITY_FOR_US = 250_000

export type VolumeOsdMode = "volume" | "sink"

export function createVolumeOsd() {
  const speaker = Wp.get_default()!.audio.default_speaker
  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")
  const description = createBinding(speaker, "description")
  const [visible, setVisible] = createState(false)
  const [mode, setMode] = createState<VolumeOsdMode>("volume")
  let hideTimer: Timer | undefined
  let sinkPriorityUntil = 0

  function show(nextMode: VolumeOsdMode, duration: number) {
    hideTimer?.cancel()
    setMode(nextMode)
    setVisible(true)
    hideTimer = timeout(duration, () => {
      hideTimer = undefined
      setVisible(false)
    })
  }

  function showVolume() {
    if (GLib.get_monotonic_time() < sinkPriorityUntil) return
    show("volume", VOLUME_VISIBLE_FOR_MS)
  }

  function showSink() {
    sinkPriorityUntil = GLib.get_monotonic_time() + SINK_PRIORITY_FOR_US
    show("sink", SINK_VISIBLE_FOR_MS)
  }

  const sinkChanged = speaker.connect("notify::id", showSink)
  const volumeChanged = speaker.connect("notify::volume", showVolume)
  const muteChanged = speaker.connect("notify::mute", showVolume)
  onCleanup(() => {
    hideTimer?.cancel()
    speaker.disconnect(sinkChanged)
    speaker.disconnect(volumeChanged)
    speaker.disconnect(muteChanged)
  })

  return { visible, mode, volume, mute, description }
}
