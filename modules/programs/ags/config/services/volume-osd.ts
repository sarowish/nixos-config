import { createBinding, createState, onCleanup } from "ags"
import { timeout, type Timer } from "ags/time"
import Wp from "gi://AstalWp?version=0.1"
import GLib from "gi://GLib?version=2.0"

const VOLUME_VISIBLE_FOR_MS = 2000
const SINK_VISIBLE_FOR_MS = 2000
const SINK_PRIORITY_FOR_US = 250_000
const BAR_CHANGE_VALID_FOR_US = 1_000_000
const VOLUME_MATCH_TOLERANCE = 0.0001

export type VolumeOsdMode = "volume" | "sink" | "sink-only"

type BarChange = {
  kind: "volume" | "mute" | "sink"
  value: number | boolean
  output: string | null
  expires: number
}

export function createVolumeOsd() {
  const wp = Wp.get_default()!
  const speaker = wp.audio.default_speaker
  const volume = createBinding(speaker, "volume")
  const mute = createBinding(speaker, "mute")
  const description = createBinding(speaker, "description")
  const [visible, setVisible] = createState(false)
  const [mode, setMode] = createState<VolumeOsdMode>("volume")
  const [barOutput, setBarOutput] = createState<string | null>(null)
  let barPopoverVisible = false
  let hideTimer: Timer | undefined
  let sinkPriorityUntil = 0
  let pendingBarChanges: BarChange[] = []
  let ready = speaker.id !== 0

  function expectBarChange(
    kind: BarChange["kind"],
    value: number | boolean,
    output: string | null,
  ) {
    const now = GLib.get_monotonic_time()
    pendingBarChanges = pendingBarChanges.filter((change) => change.expires > now)
    pendingBarChanges.push({ kind, value, output, expires: now + BAR_CHANGE_VALID_FOR_US })
  }

  function consumeBarChange(kind: BarChange["kind"], value: number | boolean) {
    const now = GLib.get_monotonic_time()
    pendingBarChanges = pendingBarChanges.filter((change) => change.expires > now)
    let index = pendingBarChanges.length - 1
    while (index >= 0) {
      const change = pendingBarChanges[index]
      // Allow quantization in reported volumes; mute states and endpoint IDs match exactly.
      const matches =
        kind === "volume" && typeof change.value === "number" && typeof value === "number"
          ? Math.abs(change.value - value) < VOLUME_MATCH_TOLERANCE
          : change.value === value
      if (change.kind === kind && matches) break
      index--
    }
    const change = index < 0 ? undefined : pendingBarChanges[index]
    // Notifications can coalesce requests. Consume older requests for the same property too.
    pendingBarChanges = pendingBarChanges.filter(
      (pending, i) => pending.kind !== kind || (index >= 0 && i > index),
    )
    return change
  }

  function show(nextMode: VolumeOsdMode, duration: number) {
    hideTimer?.cancel()
    setMode(nextMode)
    setVisible(true)
    hideTimer = timeout(duration, () => {
      hideTimer = undefined
      setVisible(false)
    })
  }

  function showVolume(output: string | null) {
    if (!ready || GLib.get_monotonic_time() < sinkPriorityUntil) return
    const keepPlacement = visible() || barPopoverVisible
    const keepSink = keepPlacement && barOutput() !== null && mode() !== "volume"
    if (!keepPlacement) setBarOutput(output)
    show(keepSink ? "sink" : "volume", VOLUME_VISIBLE_FOR_MS)
  }

  function showSink() {
    if (!ready) return
    const change = consumeBarChange("sink", speaker.id)
    pendingBarChanges = pendingBarChanges.filter((pending) => pending.kind === "sink")
    const keepPlacement = visible() || barPopoverVisible
    const keepTrack = keepPlacement ? mode() !== "sink-only" : change === undefined
    if (!keepPlacement) setBarOutput(change?.output ?? null)
    sinkPriorityUntil = GLib.get_monotonic_time() + SINK_PRIORITY_FOR_US
    show(keepTrack ? "sink" : "sink-only", SINK_VISIBLE_FOR_MS)
  }

  function changeVolumeFromBar(delta: number, output: string) {
    const next = Math.max(0, Math.min(1.5, speaker.volume + delta))
    if (next === speaker.volume) return
    expectBarChange("volume", next, output)
    speaker.volume = next
  }

  function toggleMuteFromBar() {
    const next = !speaker.mute
    expectBarChange("mute", next, null)
    speaker.mute = next
  }

  function selectSpeakerFromBar(endpoint: Wp.Endpoint, output: string) {
    if (endpoint.id === speaker.id) return
    expectBarChange("sink", endpoint.id, output)
    endpoint.is_default = true
  }

  function volumeChanged() {
    const change = consumeBarChange("volume", speaker.volume)
    showVolume(change?.output ?? null)
  }

  // Initial notifications load the current audio state before WirePlumber is ready.
  const readyHandler = wp.connect("ready", () => {
    ready = true
  })
  const sinkChanged = speaker.connect("notify::id", showSink)
  const volumeHandler = speaker.connect("notify::volume", volumeChanged)
  const muteChanged = speaker.connect("notify::mute", () => {
    if (consumeBarChange("mute", speaker.mute)) return
    pendingBarChanges = pendingBarChanges.filter((change) => change.kind !== "volume")
    showVolume(null)
  })
  onCleanup(() => {
    hideTimer?.cancel()
    wp.disconnect(readyHandler)
    speaker.disconnect(sinkChanged)
    speaker.disconnect(volumeHandler)
    speaker.disconnect(muteChanged)
  })

  return {
    visible,
    mode,
    volume,
    mute,
    description,
    barOutput,
    // Keep the current presentation through the popover's closing animation.
    setBarPopoverVisible(output: string, isVisible: boolean) {
      if (barOutput() === output) barPopoverVisible = isVisible
    },
    changeVolumeFromBar,
    toggleMuteFromBar,
    selectSpeakerFromBar,
  }
}
