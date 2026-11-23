import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test, { after, afterEach, beforeEach } from "node:test"

const serviceUrl = new URL("../services/weather.ts", import.meta.url).href
const mocks = {
  ags: `
    export function createState(value) {
      const get = () => value; get.peek = get
      return [get, (next) => { value = next }]
    }
    export const onCleanup = callback => globalThis.weatherFixture.cleanups.push(callback)
  `,
  "ags/time": `export const interval = () => ({ cancel() {} })`,
  "ags/file": `export const readFile = () => globalThis.weatherFixture.saved`,
  "gi://Gio?version=2.0": `export default { Cancellable: class {
    cancelled = false; cancel() { this.cancelled = true }; is_cancelled() { return this.cancelled }
  } }`,
  "gi://GLib?version=2.0": `export default {
    get_user_state_dir: () => '/fixture', PRIORITY_DEFAULT: 0, FileTest: { EXISTS: 1 },
    file_test: () => Boolean(globalThis.weatherFixture.saved), mkdir_with_parents: () => 0,
    file_set_contents: (_path, value) => { globalThis.weatherFixture.saved = value },
  }`,
  "gi://Soup?version=3.0": `export default {
    Message: { new: (_method, url) => ({ url, status_code: 200 }) },
    Session: class {
      send_and_read_async(message, priority, cancellable, callback) {
        globalThis.weatherFixture.requests.push({ message, cancellable, callback: value => callback(this, value) })
      }
      send_and_read_finish(value) {
        if (value instanceof Error) throw value
        return { get_data: () => new TextEncoder().encode(JSON.stringify(value)) }
      }
      abort() {}
    },
  }`,
}
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === serviceUrl) {
      if (Object.hasOwn(mocks, specifier))
        return {
          url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`,
          shortCircuit: true,
        }
      if (specifier === "./weather-state")
        return {
          url: new URL("../services/weather-state.ts", import.meta.url).href,
          shortCircuit: true,
        }
    }
    return nextResolve(specifier, context)
  },
})
const { createWeather } = await import(serviceUrl)
const turn = () => new Promise((resolve) => setImmediate(resolve))
const city = (id, name) => ({ id, name, detail: "Test region", latitude: id, longitude: id })
function forecast(temperature) {
  return {
    timezone: "UTC",
    current: { time: 1795437000, temperature_2m: temperature },
    hourly: {
      time: [1795437000],
      temperature_2m: [temperature],
      precipitation_probability: [0],
      weather_code: [0],
      is_day: [1],
    },
    daily: {
      time: [1795392000],
      temperature_2m_max: [15],
      temperature_2m_min: [8],
      weather_code: [0],
      sunrise: [1795410000],
      sunset: [1795446000],
    },
  }
}
let fixture
beforeEach(() => {
  fixture = globalThis.weatherFixture = { cleanups: [], requests: [], saved: null }
})
afterEach(() => {
  for (const cleanup of fixture.cleanups) cleanup()
})
after(() => {
  hooks.deregister()
  delete globalThis.weatherFixture
})

test("a slower previous city search cannot replace newer results", async () => {
  const weather = createWeather()
  const first = weather.search("Old city")
  const second = weather.search("New city")
  assert.equal(fixture.requests[0].cancellable.is_cancelled(), true)
  fixture.requests[1].callback({ results: [city(2, "New city")] })
  await second
  fixture.requests[0].callback({ results: [city(1, "Old city")] })
  await first
  assert.equal(weather.results()[0].name, "New city")
  assert.equal(weather.searching(), false)
})

test("changing cities during a forecast request cannot display or persist the old city's weather", async () => {
  const weather = createWeather()
  weather.select(city(1, "Old city"))
  weather.select(city(2, "New city"))
  fixture.requests[1].callback(forecast(12))
  await turn()
  fixture.requests[0].callback(forecast(30))
  await turn()
  assert.equal(weather.location().name, "New city")
  assert.equal(weather.forecast().current.temperature, 12)
  const saved = JSON.parse(fixture.saved)
  assert.equal(saved.location.name, "New city")
  assert.equal(saved.response.current.temperature_2m, 12)
})

test("an offline refresh retains the cached forecast and its original update time", async () => {
  fixture.saved = JSON.stringify({
    location: city(1, "Saved city"),
    response: forecast(12),
    updatedAt: 1795437000000,
  })
  const weather = createWeather()
  assert.equal(weather.forecast().current.temperature, 12)
  const originalError = console.error
  try {
    console.error = () => {}
    fixture.requests[0].callback(new Error("Offline"))
    await turn()
  } finally {
    console.error = originalError
  }
  assert.equal(weather.forecast().current.temperature, 12)
  assert.equal(weather.updatedAt(), 1795437000000)
  assert.match(weather.error(), /Could not update/)
  assert.equal(weather.busy(), false)
})
