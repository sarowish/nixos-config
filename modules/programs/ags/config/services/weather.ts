import { createState, onCleanup } from "ags"
import { readFile } from "ags/file"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import Soup from "gi://Soup?version=3.0"
import {
  parseForecast,
  weatherLocation,
  weatherLocations,
  type Forecast,
  type WeatherLocation,
} from "./weather-state"

export function createWeather() {
  const directory = `${GLib.get_user_state_dir()}/ags`
  const path = `${directory}/weather.json`
  const [location, setLocation] = createState<WeatherLocation | null>(null)
  const [forecast, setForecast] = createState<Forecast | null>(null)
  const [updatedAt, setUpdatedAt] = createState(0)
  const [busy, setBusy] = createState(false)
  const [error, setError] = createState("")
  const [results, setResults] = createState<WeatherLocation[]>([])
  const [searching, setSearching] = createState(false)
  const [searchError, setSearchError] = createState("")
  const session = new Soup.Session({ timeout: 15, user_agent: "ags-shell-weather/1.0" })
  let request: Gio.Cancellable | undefined
  let searchRequest: Gio.Cancellable | undefined
  let response: unknown
  let stopped = false

  try {
    if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
      const saved = JSON.parse(readFile(path))
      setLocation(weatherLocation(saved.location))
      if (
        saved.response &&
        typeof saved.updatedAt === "number" &&
        Number.isFinite(saved.updatedAt)
      ) {
        setForecast(parseForecast(saved.response))
        response = saved.response
        setUpdatedAt(saved.updatedAt)
      }
    }
  } catch (cause) {
    console.error("Saved weather:", cause)
    setError("Could not read the saved weather. Choose a city or refresh to try again.")
  }

  function save() {
    try {
      if (GLib.mkdir_with_parents(directory, 0o700) !== 0)
        throw new Error("Cannot create state directory")
      GLib.file_set_contents(
        path,
        JSON.stringify({ location: location.peek(), response, updatedAt: updatedAt.peek() }) + "\n",
      )
    } catch (cause) {
      console.error("Saving weather:", cause)
      setError("Weather is available, but your location could not be saved.")
    }
  }

  function get(url: string, cancellable: Gio.Cancellable): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const message = Soup.Message.new("GET", url)
      if (!message) return reject(new Error("Invalid weather URL."))
      session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, (source, result) => {
        try {
          const bytes = source!.send_and_read_finish(result)
          if (message.status_code !== 200)
            throw new Error(`Weather service returned HTTP ${message.status_code}.`)
          resolve(JSON.parse(new TextDecoder().decode(bytes.get_data()!)))
        } catch (cause) {
          reject(cause)
        }
      })
    })
  }

  async function refresh() {
    const city = location.peek()
    if (!city || stopped) return
    request?.cancel()
    const pending = (request = new Gio.Cancellable())
    setBusy(true)
    setError("")
    try {
      const data = await get(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&timezone=auto&timeformat=unixtime&forecast_days=5&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset`,
        pending,
      )
      if (stopped || pending.is_cancelled()) return
      setForecast(parseForecast(data))
      response = data
      setUpdatedAt(Date.now())
      save()
    } catch (cause) {
      if (!stopped && !pending.is_cancelled()) {
        console.error("Weather:", cause)
        setError("Could not update the weather. Check your connection and try again.")
      }
    } finally {
      if (request === pending) {
        request = undefined
        if (!stopped) setBusy(false)
      }
    }
  }

  async function search(query: string) {
    searchRequest?.cancel()
    setResults([])
    setSearchError("")
    query = query.trim()
    if (query.length < 2) {
      setSearching(false)
      return
    }
    const pending = (searchRequest = new Gio.Cancellable())
    setSearching(true)
    try {
      const data = await get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
        pending,
      )
      if (stopped || pending.is_cancelled()) return
      const cities = weatherLocations(data)
      setResults(cities)
      if (!cities.length) setSearchError("No matching cities.")
    } catch (cause) {
      if (!stopped && !pending.is_cancelled()) {
        console.error("Searching weather locations:", cause)
        setSearchError("Could not search for cities. Try again.")
      }
    } finally {
      if (searchRequest === pending) {
        searchRequest = undefined
        if (!stopped) setSearching(false)
      }
    }
  }

  const timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 15 * 60, () => {
    void refresh()
    return GLib.SOURCE_CONTINUE
  })
  onCleanup(() => {
    stopped = true
    GLib.Source.remove(timer)
    request?.cancel()
    searchRequest?.cancel()
    session.abort()
  })

  return {
    location,
    forecast,
    updatedAt,
    busy,
    error,
    results,
    searching,
    searchError,
    refresh,
    search,
    select(city: WeatherLocation) {
      searchRequest?.cancel()
      setSearching(false)
      setResults([])
      setLocation(city)
      setForecast(null)
      setUpdatedAt(0)
      response = undefined
      save()
      void refresh()
    },
  }
}
