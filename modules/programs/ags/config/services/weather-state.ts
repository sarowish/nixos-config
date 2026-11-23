export type WeatherLocation = {
  id: number
  name: string
  detail: string
  latitude: number
  longitude: number
}
export type WeatherHour = {
  time: number
  temperature: number | null
  rain: number | null
  code: number | null
  day: boolean
}
export type WeatherDay = {
  time: number
  high: number | null
  low: number | null
  code: number | null
  sunrise: number | null
  sunset: number | null
}
export type Forecast = {
  timezone: string
  current: {
    time: number
    temperature: number | null
    feelsLike: number | null
    wind: number | null
    code: number | null
    day: boolean
  }
  hours: WeatherHour[]
  days: WeatherDay[]
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid weather response.")
  return value as Record<string, unknown>
}
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export function weatherLocation(value: unknown): WeatherLocation {
  const data = object(value)
  const latitude = number(data.latitude),
    longitude = number(data.longitude)
  if (
    !Number.isSafeInteger(data.id) ||
    typeof data.name !== "string" ||
    !data.name ||
    latitude === null ||
    Math.abs(latitude) > 90 ||
    longitude === null ||
    Math.abs(longitude) > 180
  )
    throw new Error("Invalid weather location.")
  return {
    id: data.id as number,
    name: data.name,
    detail:
      typeof data.detail === "string"
        ? data.detail
        : [data.admin1, data.country].filter((value) => typeof value === "string").join(", "),
    latitude,
    longitude,
  }
}

export function weatherLocations(value: unknown): WeatherLocation[] {
  const results = object(value).results
  if (results === undefined) return []
  if (!Array.isArray(results)) throw new Error("Invalid location search response.")
  return results.map(weatherLocation)
}

export function parseForecast(value: unknown): Forecast {
  const data = object(value),
    current = object(data.current)
  if (typeof data.timezone !== "string" || !data.timezone || number(current.time) === null)
    throw new Error("Invalid weather response.")
  function rows(value: unknown, fields: string[]) {
    const data = object(value)
    if (!Array.isArray(data.time) || !data.time.length) throw new Error("Missing forecast times.")
    for (const field of fields)
      if (!Array.isArray(data[field]) || data[field].length !== data.time.length)
        throw new Error("Incomplete weather forecast.")
    return data.time.map((time, index) => {
      if (number(time) === null) throw new Error("Invalid forecast time.")
      return Object.fromEntries([
        ["time", time],
        ...fields.map((field) => [field, number((data[field] as unknown[])[index])]),
      ]) as Record<string, number | null>
    })
  }
  return {
    timezone: data.timezone,
    current: {
      time: current.time as number,
      temperature: number(current.temperature_2m),
      feelsLike: number(current.apparent_temperature),
      wind: number(current.wind_speed_10m),
      code: number(current.weather_code),
      day: current.is_day !== 0,
    },
    hours: rows(data.hourly, [
      "temperature_2m",
      "precipitation_probability",
      "weather_code",
      "is_day",
    ]).map((row) => ({
      time: row.time!,
      temperature: row.temperature_2m,
      rain: row.precipitation_probability,
      code: row.weather_code,
      day: row.is_day !== 0,
    })),
    days: rows(data.daily, [
      "temperature_2m_max",
      "temperature_2m_min",
      "weather_code",
      "sunrise",
      "sunset",
    ]).map((row) => ({
      time: row.time!,
      high: row.temperature_2m_max,
      low: row.temperature_2m_min,
      code: row.weather_code,
      sunrise: row.sunrise,
      sunset: row.sunset,
    })),
  }
}

export function weatherCondition(code: number | null, day = true) {
  if (code === 0)
    return { text: "Clear", icon: day ? "weather-clear-symbolic" : "weather-clear-night-symbolic" }
  if (code === 1 || code === 2)
    return {
      text: code === 1 ? "Mostly clear" : "Partly cloudy",
      icon: day ? "weather-few-clouds-symbolic" : "weather-few-clouds-night-symbolic",
    }
  if (code === 3) return { text: "Overcast", icon: "weather-overcast-symbolic" }
  if (code === 45 || code === 48) return { text: "Fog", icon: "weather-fog-symbolic" }
  if ([51, 53, 55, 56, 57].includes(code ?? -1))
    return { text: "Drizzle", icon: "weather-showers-scattered-symbolic" }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1))
    return { text: "Rain", icon: "weather-showers-symbolic" }
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1))
    return { text: "Snow", icon: "weather-snow-symbolic" }
  if ([95, 96, 99].includes(code ?? -1))
    return { text: "Thunderstorms", icon: "weather-storm-symbolic" }
  return { text: "Conditions unavailable", icon: "weather-overcast-symbolic" }
}

export const temperature = (value: number | null | undefined) =>
  value == null ? "—" : `${Math.round(value)}°`

export function forecastHours(forecast: Forecast, now: number) {
  // Include the current hour; compare instants, not the computer's local clock.
  return forecast.hours.filter((hour) => hour.time > now / 1000 - 3600).slice(0, 6)
}
