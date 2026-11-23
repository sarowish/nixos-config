import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test, { after, afterEach, beforeEach } from "node:test"

const serviceUrl = new URL("../services/power.ts", import.meta.url).href
const mocks = {
  ags: `
    export function createState(value) {
      const get = () => value
      get.peek = get
      return [get, (next) => { value = next }]
    }
    export const onCleanup = (callback) => globalThis.powerFixture.cleanups.push(callback)
  `,
  "ags/process": `export const execAsync = async () => { throw new Error('Unexpected session action') }`,
  "gi://Gio?version=2.0": `
    export default {
      Cancellable: class { cancelled = false; cancel() { this.cancelled = true }; is_cancelled() { return this.cancelled } },
      DBusCallFlags: { ALLOW_INTERACTIVE_AUTHORIZATION: 1 },
      BusType: { SYSTEM: 1 }, DBusProxyFlags: { GET_INVALIDATED_PROPERTIES: 1 },
      DBusProxy: {
        new_for_bus(...args) { queueMicrotask(() => args.at(-1)(null, globalThis.powerFixture.proxy)) },
        new_for_bus_finish(result) { return result },
      },
    }
  `,
  "gi://GLib?version=2.0": `
    export class Variant {
      constructor(type, value) { this.type = type; this.value = value }
      deep_unpack() { return this.value }
    }
    export default { Variant }
  `,
}
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === serviceUrl) {
      if (Object.hasOwn(mocks, specifier))
        return {
          url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
          shortCircuit: true,
        }
      if (specifier === "./power-state")
        return {
          url: new URL("../services/power-state.ts", import.meta.url).href,
          shortCircuit: true,
        }
    }
    return nextResolve(specifier, context)
  },
})
const { createPower } = await import(serviceUrl)
const turn = () => new Promise((resolve) => setImmediate(resolve))
const variant = (value) => ({
  deep_unpack: () => value,
  get_child_value: (index) => ({
    get_string: () => [value[index]],
    get_uint64: () => value[index],
  }),
})
let fixture
beforeEach(() => {
  const handlers = new Map()
  fixture = globalThis.powerFixture = {
    cleanups: [],
    requests: [],
    cached: ["", 0],
    proxy: {
      g_name_owner: ":1.1",
      connect(signal, callback) {
        const id = Symbol()
        handlers.set(id, { signal, callback })
        return id
      },
      disconnect(id) {
        handlers.delete(id)
      },
      get_cached_property() {
        return variant(fixture.cached)
      },
      set_cached_property(_property, value) {
        fixture.cached = value.deep_unpack()
      },
      call(method, parameters, _flags, _timeout, cancellable, callback) {
        fixture.requests.push({ method, parameters, callback, cancellable })
      },
      call_finish(result) {
        if (result instanceof Error) throw result
        return result
      },
    },
    emit(signal) {
      for (const handler of handlers.values()) if (handler.signal === signal) handler.callback()
    },
    reply(value) {
      const request = fixture.requests.shift()
      request.callback(fixture.proxy, value)
      return request
    },
  }
})
afterEach(() => {
  for (const cleanup of fixture.cleanups) cleanup()
})
after(() => {
  hooks.deregister()
  delete globalThis.powerFixture
})

test("scheduling uses logind's microsecond timestamp and reads back authoritative state", async () => {
  const power = createPower()
  await turn()
  const when = Date.now() + 60_000
  const scheduled = power.scheduleShutdown(when)
  assert.equal(fixture.requests[0].method, "ScheduleShutdown")
  assert.equal(fixture.requests[0].parameters.type, "(st)")
  assert.deepEqual(fixture.requests[0].parameters.deep_unpack(), ["poweroff", when * 1000])
  assert.equal(power.schedule(), null)
  assert.equal(
    await power.cancelShutdown(),
    false,
    "duplicate actions are blocked while awaiting logind",
  )
  fixture.reply(variant([]))
  await turn()
  assert.equal(fixture.requests[0].method, "org.freedesktop.DBus.Properties.Get")
  fixture.reply(variant([variant(["poweroff", when * 1000])]))
  assert.equal(await scheduled, true)
  assert.deepEqual(power.schedule(), { type: "poweroff", when })
})

test("a denied cancellation retains the schedule and releases the busy state", async () => {
  fixture.cached = ["poweroff", 1795437000000000]
  const power = createPower()
  await turn()
  const pending = power.cancelShutdown()
  fixture.reply(new Error("Not authorized"))
  assert.equal(await pending, false)
  assert.match(power.error(), /Not authorized/)
  assert.equal(power.busy(), false)
  assert.equal(power.schedule().when, 1795437000000)
})

test("past deadlines never reach logind, which would execute them immediately", async () => {
  const power = createPower()
  await turn()
  assert.equal(await power.scheduleShutdown(Date.now() - 1000), false)
  assert.equal(fixture.requests.length, 0)
  assert.match(power.error(), /future/)
})

test("a late read cannot restore a schedule cancelled externally while it was pending", async () => {
  const power = createPower()
  await turn()
  const pending = power.refresh()
  fixture.cached = ["", 0]
  fixture.emit("g-properties-changed")
  fixture.reply(variant([variant(["poweroff", 1795437000000000])]))
  await pending
  assert.equal(power.schedule(), null)
  fixture.proxy.g_name_owner = null
  fixture.emit("notify::g-name-owner")
  assert.equal(power.available(), false)
})
