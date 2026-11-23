import assert from "node:assert/strict"
import test from "node:test"
import {
  forecastHours,
  parseForecast,
  temperature,
  weatherCondition,
  weatherLocation,
  weatherLocations,
} from "../services/weather-state.ts"

function response() {
  return {
    timezone: "Asia/Tokyo",
    current: {
      time: 1795437000,
      temperature_2m: 12.4,
      apparent_temperature: null,
      weather_code: 0,
      is_day: 0,
      wind_speed_10m: 7,
    },
    hourly: {
      time: [1795431600, 1795435200, 1795438800],
      temperature_2m: [13, 12, null],
      precipitation_probability: [0, 10, null],
      weather_code: [0, 2, 3],
      is_day: [1, 0, 0],
    },
    daily: {
      time: [1795359600],
      temperature_2m_max: [15],
      temperature_2m_min: [8],
      weather_code: [2],
      sunrise: [1795383000],
      sunset: [1795419000],
    },
  }
}

test("weather preserves missing measurements instead of showing zero degrees or zero rain", () => {
  const forecast = parseForecast(response())
  assert.equal(forecast.current.temperature, 12.4)
  assert.equal(forecast.current.feelsLike, null)
  assert.equal(forecast.current.day, false)
  assert.equal(forecast.hours[2].rain, null)
  assert.equal(temperature(forecast.hours[2].temperature), "—")
  assert.equal(temperature(-2.3), "-2°")
})

test("incomplete forecast arrays and invalid timestamps cannot misalign measurements", () => {
  const missing = response()
  missing.hourly.weather_code.pop()
  assert.throws(() => parseForecast(missing), /Incomplete/)
  const invalid = response()
  invalid.daily.time[0] = null
  assert.throws(() => parseForecast(invalid), /time/)
})

test("hourly forecasts use absolute instants even when the location is in another time zone", () => {
  const forecast = parseForecast(response())
  assert.deepEqual(
    forecastHours(forecast, 1795437000000).map((hour) => hour.time),
    [1795435200, 1795438800],
  )
  assert.deepEqual(forecastHours(forecast, 1795446000000), [])
})

test("city search distinguishes identically named locations and rejects invalid coordinates", () => {
  const locations = weatherLocations({
    results: [
      {
        id: 1,
        name: "Cambridge",
        admin1: "England",
        country: "United Kingdom",
        latitude: 52.2,
        longitude: 0.12,
      },
      {
        id: 2,
        name: "Cambridge",
        admin1: "Massachusetts",
        country: "United States",
        latitude: 42.37,
        longitude: -71.11,
      },
    ],
  })
  assert.equal(locations[0].detail, "England, United Kingdom")
  assert.equal(locations[1].detail, "Massachusetts, United States")
  assert.deepEqual(weatherLocation(locations[0]), locations[0])
  assert.deepEqual(weatherLocations({}), [])
  assert.throws(() => weatherLocation({ id: 1, name: "Broken", latitude: 91, longitude: 0 }))
})

test("night conditions, frozen precipitation and storms get their appropriate presentation", () => {
  assert.equal(weatherCondition(0, false).icon, "weather-clear-night-symbolic")
  assert.equal(weatherCondition(86).text, "Snow")
  assert.equal(weatherCondition(99).text, "Thunderstorms")
  assert.equal(weatherCondition(null).text, "Conditions unavailable")
})
