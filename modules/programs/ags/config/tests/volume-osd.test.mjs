import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test, { after, afterEach, beforeEach } from "node:test"

const serviceUrl = new URL("../services/volume-osd.ts", import.meta.url).href
// Exercise the service without a desktop session or changes to the real audio device.
const mockSources = {
  ags: `
    export const createBinding = (object, property) => () => object[property]
    export function createState(value) {
      return [() => value, (next) => { value = next }]
    }
    export const onCleanup = (callback) => globalThis.volumeOsdFixture.cleanups.push(callback)
  `,
  "ags/time": `
    export function timeout(duration, callback) {
      const fixture = globalThis.volumeOsdFixture
      const timer = { due: fixture.now + duration * 1000, callback }
      fixture.timers.add(timer)
      return { cancel: () => fixture.timers.delete(timer) }
    }
  `,
  "gi://AstalWp?version=0.1": `
    export default {
      get_default: () => globalThis.volumeOsdFixture.wp,
    }
  `,
  "gi://GLib?version=2.0": `
    export default { get_monotonic_time: () => globalThis.volumeOsdFixture.now }
  `,
}
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === serviceUrl && Object.hasOwn(mockSources, specifier))
      return {
        url: `data:text/javascript,${encodeURIComponent(mockSources[specifier])}`,
        shortCircuit: true,
      }
    return nextResolve(specifier, context)
  },
})
const { createVolumeOsd } = await import(serviceUrl)

let fixture
beforeEach(() => {
  const handlers = new Map()
  let currentVolume = 0.5
  let currentMute = false
  fixture = {
    now: 0,
    timers: new Set(),
    cleanups: [],
    requests: [],
    muteRequests: [],
    sinkRequests: [],
    speaker: {
      id: 1,
      get mute() {
        return currentMute
      },
      set mute(value) {
        fixture.muteRequests.push(value)
      },
      description: "Speakers",
      get volume() {
        return currentVolume
      },
      set volume(value) {
        fixture.requests.push(value)
      },
      connect(signal, callback) {
        const id = Symbol(signal)
        handlers.set(id, { signal, callback })
        return id
      },
      disconnect(id) {
        handlers.delete(id)
      },
    },
    update(property, value) {
      if (property === "volume") currentVolume = value
      else if (property === "mute") currentMute = value
      else fixture.speaker[property] = value
      for (const { signal, callback } of handlers.values())
        if (signal === `notify::${property}`) callback()
    },
    ready() {
      for (const { signal, callback } of handlers.values()) if (signal === "ready") callback()
    },
    advance(milliseconds) {
      fixture.now += milliseconds * 1000
      for (const timer of fixture.timers)
        if (timer.due <= fixture.now) {
          fixture.timers.delete(timer)
          timer.callback()
        }
    },
  }
  fixture.wp = {
    audio: { default_speaker: fixture.speaker },
    connect: fixture.speaker.connect,
    disconnect: fixture.speaker.disconnect,
  }
  globalThis.volumeOsdFixture = fixture
})

function endpoint(id) {
  return {
    id,
    get is_default() {
      return fixture.speaker.id === id
    },
    set is_default(value) {
      if (value) fixture.sinkRequests.push(id)
    },
  }
}
afterEach(() => {
  for (const cleanup of fixture.cleanups) cleanup()
  assert.equal(fixture.timers.size, 0)
})
after(() => {
  hooks.deregister()
  delete globalThis.volumeOsdFixture
})

test("initial audio notifications stay silent until WirePlumber is ready", () => {
  fixture.speaker.id = 0
  fixture.update("volume", 0)
  const osd = createVolumeOsd()

  fixture.update("id", 1)
  fixture.update("description", "Speakers")
  fixture.update("volume", 0.5)
  fixture.update("mute", true)
  assert.equal(osd.visible(), false)
  assert.equal(fixture.timers.size, 0)
  assert.equal(osd.volume(), 0.5)
  assert.equal(osd.mute(), true)

  fixture.ready()
  assert.equal(osd.visible(), false)
  fixture.update("volume", 0.55)
  assert.equal(osd.visible(), true)
  assert.equal(osd.mode(), "volume")
  fixture.advance(2000)

  fixture.update("mute", false)
  assert.equal(osd.visible(), true)
  fixture.advance(2000)

  fixture.update("id", 2)
  assert.equal(osd.visible(), true)
  assert.equal(osd.mode(), "sink")
})

test("a quantized bar update opens a popover that stays selected through shortcut updates", () => {
  const osd = createVolumeOsd()
  fixture.update("volume", 0.800048842030992)
  fixture.advance(2000)
  osd.changeVolumeFromBar(-0.05, "DP-1")
  assert.equal(osd.visible(), false)
  assert.deepEqual(fixture.requests, [0.750048842030992])

  fixture.update("volume", 0.7500457735735039)
  assert.equal(osd.barOutput(), "DP-1")
  assert.equal(osd.visible(), true)

  fixture.update("volume", 0.800048842030992)
  assert.equal(osd.barOutput(), "DP-1")
  fixture.advance(2000)
  assert.equal(osd.visible(), false)
  fixture.update("volume", 0.75)
  assert.equal(osd.barOutput(), null)
})

test("coalesced scrolls choose a monitor and keep it until the popover hides", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  osd.changeVolumeFromBar(0.1, "HDMI-A-1")
  osd.changeVolumeFromBar(0.1, "DP-2")
  fixture.update("volume", 0.6)
  assert.equal(osd.barOutput(), "DP-2")

  osd.changeVolumeFromBar(-0.05, "DP-1")
  fixture.update("volume", 0.55)
  assert.equal(osd.barOutput(), "DP-2")

  fixture.advance(2000)
  osd.changeVolumeFromBar(-0.05, "DP-1")
  fixture.update("volume", 0.5)
  assert.equal(osd.barOutput(), "DP-1")
})

test("scrolling keeps an existing external OSD and chooses a popover only after it hides", () => {
  const osd = createVolumeOsd()
  fixture.update("volume", 0.55)
  osd.changeVolumeFromBar(0.05, "HDMI-A-1")
  fixture.update("volume", 0.6)
  assert.equal(osd.barOutput(), null)

  fixture.advance(2000)
  assert.equal(osd.visible(), false)
  osd.changeVolumeFromBar(0.05, "HDMI-A-1")
  fixture.update("volume", 0.65)
  assert.equal(osd.barOutput(), "HDMI-A-1")
})

test("adjustments during a popover's closing fade keep its placement and output panel", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.55)
  osd.setBarPopoverVisible("DP-1", true)
  fixture.advance(2000)
  assert.equal(osd.visible(), false)

  fixture.update("volume", 0.6)
  assert.equal(osd.visible(), true)
  assert.equal(osd.barOutput(), "DP-1")
  fixture.advance(2000)

  osd.selectSpeakerFromBar(endpoint(2), "HDMI-A-1")
  fixture.update("id", 2)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), "DP-1")
  fixture.advance(2000)

  osd.changeVolumeFromBar(0.05, "HDMI-A-1")
  fixture.update("volume", 0.65)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), "DP-1")
  fixture.advance(2000)

  osd.setBarPopoverVisible("DP-1", false)
  fixture.update("volume", 0.7)
  assert.equal(osd.mode(), "volume")
  assert.equal(osd.barOutput(), null)
})

test("callbacks from another monitor cannot release the current popover's placement", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.55)
  osd.setBarPopoverVisible("DP-1", true)
  fixture.advance(2000)
  osd.setBarPopoverVisible("HDMI-A-1", false)
  fixture.update("volume", 0.6)
  assert.equal(osd.barOutput(), "DP-1")

  fixture.advance(2000)
  osd.setBarPopoverVisible("DP-1", false)
  osd.setBarPopoverVisible("HDMI-A-1", true)
  fixture.update("volume", 0.65)
  assert.equal(osd.barOutput(), null)
})

test("scrolling at either volume limit does not tag the next external change", () => {
  const osd = createVolumeOsd()
  fixture.update("volume", 1.5)
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 1.45)
  assert.equal(osd.barOutput(), null)

  fixture.update("volume", 0)
  osd.changeVolumeFromBar(-0.05, "DP-1")
  fixture.update("volume", 0.05)
  assert.equal(osd.barOutput(), null)
  assert.deepEqual(fixture.requests, [])
})

test("expired or interrupted bar requests cannot claim later shortcut changes", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.advance(1000)
  fixture.update("volume", 0.55)
  assert.equal(osd.barOutput(), null)

  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.65)
  fixture.update("volume", 0.6)
  assert.equal(osd.barOutput(), null)
})

test("mute changes keep bar placement and restart the visibility timer", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.55)
  fixture.advance(1500)
  fixture.update("mute", true)
  assert.equal(osd.barOutput(), "DP-1")
  fixture.advance(500)
  assert.equal(osd.visible(), true)
  fixture.advance(1500)
  assert.equal(osd.visible(), false)
})

test("bar mute notifications stay silent and leave an existing visibility timeout alone", () => {
  const osd = createVolumeOsd()
  osd.toggleMuteFromBar()
  assert.deepEqual(fixture.muteRequests, [true])
  fixture.update("mute", true)
  assert.equal(osd.mute(), true)
  assert.equal(osd.visible(), false)

  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.55)
  fixture.advance(1500)
  osd.toggleMuteFromBar()
  fixture.update("mute", false)
  assert.equal(osd.barOutput(), "DP-1")
  assert.equal(osd.visible(), true)
  fixture.advance(500)
  assert.equal(osd.visible(), false)

  fixture.update("mute", true)
  assert.equal(osd.visible(), true)
  assert.equal(osd.barOutput(), null)
})

test("expired bar mute requests do not suppress later shortcut notifications", () => {
  const osd = createVolumeOsd()
  osd.toggleMuteFromBar()
  fixture.advance(1000)
  fixture.update("mute", true)
  assert.equal(osd.visible(), true)
  fixture.advance(2000)

  fixture.update("mute", false)
  assert.equal(osd.visible(), true)
})

test("a new bar output switch shows only the output and preserves that choice while cycling", () => {
  const osd = createVolumeOsd()
  osd.selectSpeakerFromBar(endpoint(2), "HDMI-A-1")
  assert.deepEqual(fixture.sinkRequests, [2])
  assert.equal(osd.visible(), false)
  fixture.update("description", "Headphones")
  fixture.update("id", 2)
  fixture.update("volume", 0.9)
  fixture.update("mute", true)
  assert.equal(osd.mode(), "sink-only")
  assert.equal(osd.barOutput(), "HDMI-A-1")
  assert.equal(osd.description(), "Headphones")

  osd.selectSpeakerFromBar(endpoint(3), "DP-1")
  fixture.update("id", 3)
  assert.equal(osd.mode(), "sink-only")
  assert.equal(osd.barOutput(), "HDMI-A-1")

  fixture.advance(250)
  osd.changeVolumeFromBar(-0.05, "DP-1")
  fixture.update("volume", 0.85)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), "HDMI-A-1")
})

test("volume adjustments retain an output panel in the popover until it closes", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.55)
  osd.selectSpeakerFromBar(endpoint(2), "HDMI-A-1")
  fixture.update("id", 2)
  fixture.advance(250)

  osd.changeVolumeFromBar(0.05, "HDMI-A-1")
  fixture.update("volume", 0.6)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), "DP-1")

  fixture.advance(1500)
  fixture.update("volume", 0.65)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), "DP-1")
  fixture.advance(500)
  assert.equal(osd.visible(), true)
  fixture.advance(1500)
  assert.equal(osd.visible(), false)

  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.7)
  assert.equal(osd.mode(), "volume")
  assert.equal(osd.barOutput(), "DP-1")
})

test("bar output switches keep an existing track and its placement in either container", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("volume", 0.55)
  osd.selectSpeakerFromBar(endpoint(2), "HDMI-A-1")
  fixture.update("id", 2)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), "DP-1")

  fixture.advance(2000)
  fixture.update("volume", 0.6)
  assert.equal(osd.barOutput(), null)
  osd.selectSpeakerFromBar(endpoint(3), "HDMI-A-1")
  fixture.update("id", 3)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), null)
})

test("unchanged and expired bar output selections leave external output feedback intact", () => {
  const osd = createVolumeOsd()
  osd.selectSpeakerFromBar(endpoint(1), "DP-1")
  assert.deepEqual(fixture.sinkRequests, [])

  osd.selectSpeakerFromBar(endpoint(2), "DP-1")
  fixture.advance(1000)
  fixture.update("id", 2)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), null)
})

test("output switching clears pending bar requests and retains sink priority", () => {
  const osd = createVolumeOsd()
  osd.changeVolumeFromBar(0.05, "DP-1")
  fixture.update("id", 2)
  fixture.update("volume", 0.55)
  assert.equal(osd.mode(), "sink")
  assert.equal(osd.barOutput(), null)

  fixture.advance(250)
  fixture.update("volume", 0.6)
  assert.equal(osd.mode(), "volume")
  assert.equal(osd.barOutput(), null)
})
