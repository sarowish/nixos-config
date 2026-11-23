import { createComputed, createState, For, type Accessor } from "ags"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import type { createWeather } from "../services/weather"
import {
  forecastHours,
  temperature,
  weatherCondition,
  type WeatherHour,
  type WeatherDay,
} from "../services/weather-state"

export default function WeatherCard({
  weather,
  now,
}: {
  weather: ReturnType<typeof createWeather>
  now: Accessor<number>
}) {
  const [choosing, setChoosing] = createState(!weather.location.peek())
  const [expanded, setExpanded] = createState(false)
  const time = (seconds: number, format: string) =>
    GLib.DateTime.new_from_unix_utc(seconds)
      .to_timezone(GLib.TimeZone.new_identifier(weather.forecast.peek()?.timezone ?? "UTC"))!
      .format(format) ?? ""
  const condition = createComputed(() =>
    weatherCondition(weather.forecast()?.current.code ?? null, weather.forecast()?.current.day),
  )
  const today = createComputed(() => {
    const forecast = weather.forecast()
    if (!forecast) return undefined
    const date = time(Math.floor(now() / 1000), "%F")
    return forecast.days.find((day) => time(day.time, "%F") === date)
  })
  const updated = createComputed(() => {
    const at = weather.updatedAt()
    if (!at) return ""
    const minutes = Math.max(0, Math.floor((now() - at) / 60_000))
    return minutes < 1
      ? "Updated just now"
      : minutes < 60
        ? `Updated ${minutes}m ago`
        : `Updated ${Math.floor(minutes / 60)}h ago`
  })
  const search = new Gtk.SearchEntry({ placeholder_text: "Search for a city…", hexpand: true })
  search.connect("search-changed", () => void weather.search(search.text))

  return (
    <box class="panel-card weather-card" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <box spacing={8}>
        <image iconName="mark-location-symbolic" pixelSize={16} />
        <label
          class="section-title"
          xalign={0}
          hexpand
          ellipsize={Pango.EllipsizeMode.END}
          label={weather.location((city) => city?.name ?? "Weather")}
          tooltipText={weather.location((city) => city?.detail ?? "Choose your weather location")}
        />
        <button
          class="icon-button"
          tooltipText="Change weather location"
          onClicked={() => {
            setChoosing(!choosing.peek())
            if (choosing.peek()) search.grab_focus()
            else void weather.search("")
          }}
        >
          <image iconName="find-location-symbolic" pixelSize={16} />
        </button>
        <button
          class="icon-button"
          tooltipText="Refresh weather"
          sensitive={createComputed(() => Boolean(weather.location()) && !weather.busy())}
          onClicked={() => void weather.refresh()}
        >
          <image iconName="view-refresh-symbolic" pixelSize={16} />
        </button>
      </box>
      <box visible={choosing} orientation={Gtk.Orientation.VERTICAL} spacing={6}>
        {search}
        <label class="muted" xalign={0} visible={weather.searching} label="Searching…" />
        <label
          class="muted"
          xalign={0}
          wrap
          visible={weather.searchError((value) => Boolean(value))}
          label={weather.searchError}
        />
        <For each={weather.results}>
          {(city) => (
            <button
              class="location-result"
              onClicked={() => {
                weather.select(city)
                setChoosing(false)
                search.text = ""
              }}
            >
              <box orientation={Gtk.Orientation.VERTICAL} spacing={2}>
                <label xalign={0} label={city.name} />
                <label
                  class="muted"
                  xalign={0}
                  ellipsize={Pango.EllipsizeMode.END}
                  label={city.detail}
                />
              </box>
            </button>
          )}
        </For>
      </box>
      <box
        visible={weather.forecast((value) => value !== null)}
        orientation={Gtk.Orientation.VERTICAL}
        spacing={14}
      >
        <button
          class="weather-summary"
          tooltipText="Expand or collapse the forecast"
          onClicked={() => setExpanded(!expanded.peek())}
        >
          <box spacing={16}>
            <image
              class="weather-icon"
              iconName={condition((value) => value.icon)}
              pixelSize={48}
            />
            <box orientation={Gtk.Orientation.VERTICAL} hexpand spacing={2}>
              <label
                class="temperature"
                xalign={0}
                label={weather.forecast((value) => temperature(value?.current.temperature))}
              />
              <label xalign={0} wrap label={condition((value) => value.text)} />
              <label
                class="muted"
                xalign={0}
                label={weather.forecast(
                  (value) => `Feels like ${temperature(value?.current.feelsLike)}`,
                )}
              />
            </box>
            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER} spacing={5}>
              <label label={today((value) => `↑ ${temperature(value?.high)}`)} />
              <label class="muted" label={today((value) => `↓ ${temperature(value?.low)}`)} />
              <image
                iconName={expanded((value) => (value ? "pan-up-symbolic" : "pan-down-symbolic"))}
                pixelSize={12}
              />
            </box>
          </box>
        </button>
        <box class="hourly-forecast" homogeneous spacing={4}>
          <For
            each={createComputed(() =>
              weather.forecast() ? forecastHours(weather.forecast()!, now()) : [],
            )}
          >
            {(hour: WeatherHour) => (
              <box orientation={Gtk.Orientation.VERTICAL} spacing={7}>
                <label class="muted" label={time(hour.time, "%H:%M")} />
                <image
                  iconName={weatherCondition(hour.code, hour.day).icon}
                  tooltipText={weatherCondition(hour.code, hour.day).text}
                  pixelSize={18}
                />
                <label label={temperature(hour.temperature)} />
                <label
                  class="rain-chance"
                  label={hour.rain === null ? "—" : `${Math.round(hour.rain)}%`}
                  tooltipText="Precipitation probability"
                />
              </box>
            )}
          </For>
        </box>
        <revealer revealChild={expanded} transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}>
          <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
            <For each={weather.forecast((value) => value?.days ?? [])}>
              {(day: WeatherDay) => (
                <box spacing={10}>
                  <label xalign={0} hexpand label={time(day.time, "%a %e")} />
                  <image
                    iconName={weatherCondition(day.code).icon}
                    tooltipText={weatherCondition(day.code).text}
                    pixelSize={18}
                  />
                  <label widthChars={5} xalign={1} label={temperature(day.high)} />
                  <label class="muted" widthChars={5} xalign={1} label={temperature(day.low)} />
                </box>
              )}
            </For>
            <label
              class="muted"
              xalign={0}
              label={weather.forecast(
                (value) =>
                  `Wind ${value?.current.wind == null ? "—" : Math.round(value.current.wind)} km/h`,
              )}
            />
            <label
              class="muted"
              xalign={0}
              label={today((value) =>
                value
                  ? `Sunrise ${value.sunrise === null ? "—" : time(value.sunrise, "%H:%M")} · Sunset ${value.sunset === null ? "—" : time(value.sunset, "%H:%M")}`
                  : "",
              )}
            />
          </box>
        </revealer>
      </box>
      <label
        class="muted"
        xalign={0}
        visible={createComputed(() => weather.busy() && !weather.forecast())}
        label="Loading weather…"
      />
      <label
        class="error"
        xalign={0}
        wrap
        visible={weather.error((value) => Boolean(value))}
        label={weather.error}
      />
      <box spacing={8}>
        <label class="muted updated-at" xalign={0} hexpand label={updated} />
        <Gtk.LinkButton
          uri="https://open-meteo.com/"
          label="Open-Meteo"
          tooltipText="Weather data by Open-Meteo · CC BY 4.0"
        />
      </box>
    </box>
  )
}
