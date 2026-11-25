import app from "ags/gtk4/app"
import { createEffect, createState, onCleanup } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { interval } from "ags/time"
import GLib from "gi://GLib?version=2.0"
import type { createPower } from "../services/power"
import type { createWeather } from "../services/weather"
import type { createVolumeOsd } from "../services/volume-osd"
import { registerOverlay } from "../widgets/overlays"
import WeatherCard from "./WeatherCard"
import AudioControls from "./AudioControls"
import PowerControls from "./PowerControls"

export function createSidePanel({
  power,
  weather,
  volumeOsd,
  focusedOutput,
  openWallpapers,
}: {
  power: ReturnType<typeof createPower>
  weather: ReturnType<typeof createWeather>
  volumeOsd: ReturnType<typeof createVolumeOsd>
  focusedOutput: () => string | undefined
  openWallpapers: (monitor: Gdk.Monitor) => void
}) {
  const [monitor, setMonitor] = createState<Gdk.Monitor | null>(null)
  const open = monitor((value) => value !== null)
  const [now, setNow] = createState(Date.now())
  let progress = 0
  let target = 0
  let from = 0
  let started = 0
  let tick: number | undefined
  let weatherRefresh: number | undefined
  let width = 400

  const backdrop = new Astal.Window({
    name: "panel-backdrop",
    namespace: "ags-popup-backdrop",
    css_classes: ["PopupBackdrop"],
    layer: Astal.Layer.OVERLAY,
    anchor:
      Astal.WindowAnchor.TOP |
      Astal.WindowAnchor.BOTTOM |
      Astal.WindowAnchor.LEFT |
      Astal.WindowAnchor.RIGHT,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.NONE,
  })
  const outside = new Gtk.GestureClick({ button: 0 })
  outside.connect("pressed", () => close())
  backdrop.add_controller(outside)
  backdrop.set_child(new Gtk.Box({ hexpand: true, vexpand: true }))

  const closeButton = (
    <button class="icon-button" tooltipText="Close panel (Escape)" onClicked={() => close()}>
      <image iconName="window-close-symbolic" pixelSize={18} />
    </button>
  ) as Gtk.Button
  const powerScroll = (
    <scrolledwindow hscrollbarPolicy={Gtk.PolicyType.NEVER} propagateNaturalHeight>
      <PowerControls power={power} now={now} open={open} onClose={close} />
    </scrolledwindow>
  ) as Gtk.ScrolledWindow
  const content = (
    <box class="panel-content" orientation={Gtk.Orientation.VERTICAL}>
      <box class="panel-header" spacing={12}>
        <box orientation={Gtk.Orientation.VERTICAL} hexpand spacing={3}>
          <label class="panel-title" xalign={0} label="Control center" />
          <label
            class="muted"
            xalign={0}
            label={now(
              (value) =>
                GLib.DateTime.new_from_unix_local(Math.floor(value / 1000)).format("%A, %e %B") ??
                "",
            )}
          />
        </box>
        {closeButton}
      </box>
      <scrolledwindow class="panel-main" vexpand hscrollbarPolicy={Gtk.PolicyType.NEVER}>
        <box orientation={Gtk.Orientation.VERTICAL} spacing={16}>
          <WeatherCard weather={weather} now={now} />
          <button
            class="wallpaper-shortcut"
            onClicked={() => {
              const output = monitor.peek()
              close()
              if (output) openWallpapers(output)
            }}
          >
            <box spacing={12}>
              <image iconName="preferences-desktop-wallpaper-symbolic" pixelSize={24} />
              <box orientation={Gtk.Orientation.VERTICAL} hexpand spacing={3}>
                <label class="section-title" xalign={0} label="Wallpapers" />
                <label class="muted" xalign={0} label="Choose a background & accent" />
              </box>
              <image iconName="go-next-symbolic" pixelSize={16} />
            </box>
          </button>
          <AudioControls />
        </box>
      </scrolledwindow>
      {powerScroll}
    </box>
  ) as Gtk.Box
  const window = new Astal.Window({
    name: "panel",
    namespace: "ags-side-panel",
    css_classes: ["SidePanel"],
    layer: Astal.Layer.OVERLAY,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.NONE,
    child: content,
  })
  const keys = new Gtk.EventControllerKey({ propagation_phase: Gtk.PropagationPhase.CAPTURE })
  keys.connect("key-pressed", (_keys, key) => {
    if (key !== Gdk.KEY_Escape) return false
    close()
    return true
  })
  window.add_controller(keys)
  app.add_window(backdrop)
  app.add_window(window)
  const dismissOthers = registerOverlay(close)

  function cancelWeatherRefresh() {
    if (weatherRefresh !== undefined) GLib.Source.remove(weatherRefresh)
    weatherRefresh = undefined
  }

  function animate(next: number) {
    cancelWeatherRefresh()
    from = progress
    target = next
    started = 0
    if (tick !== undefined) return
    tick = window.add_tick_callback((_widget, clock) => {
      const now = clock.get_frame_time()
      if (!started) started = now
      const elapsed = Math.min(1, (now - started) / 200_000)
      progress = from + (target - from) * (1 - (1 - elapsed) ** 3)
      window.margin_right = Math.round((1 - progress) * (1 - width))
      if (elapsed < 1) return true
      tick = undefined
      if (!target) window.set_visible(false)
      else {
        // Let the final animation frame paint before initializing weather networking.
        weatherRefresh = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          weatherRefresh = undefined
          if (
            monitor.peek() &&
            weather.location.peek() &&
            Date.now() - weather.updatedAt.peek() > 15 * 60_000 &&
            !weather.busy.peek()
          )
            void weather.refresh()
          return GLib.SOURCE_REMOVE
        })
      }
      return false
    })
  }

  function close(immediate = false) {
    if (!monitor.peek()) return
    cancelWeatherRefresh()
    setMonitor(null)
    window.keymode = Astal.Keymode.NONE
    content.sensitive = false
    backdrop.set_visible(false)
    if (immediate) {
      if (tick !== undefined) window.remove_tick_callback(tick)
      tick = undefined
      progress = target = 0
      window.set_visible(false)
    } else animate(0)
  }

  function show(output: Gdk.Monitor) {
    dismissOthers()
    window.gdkmonitor = output
    backdrop.gdkmonitor = output
    const geometry = output.get_geometry()
    width = Math.min(400, geometry.width)
    content.width_request = width
    powerScroll.max_content_height = Math.floor(geometry.height * 0.6)
    window.set_default_size(width, 0)
    window.margin_right = Math.round((1 - progress) * (1 - width))
    content.sensitive = true
    window.keymode = Astal.Keymode.EXCLUSIVE
    setMonitor(output)
    backdrop.present()
    window.present()
    closeButton.grab_focus()
    animate(1)
    void power.refresh()
  }

  createEffect(() => {
    const visible = open()
    volumeOsd.setPanelVisible(visible)
    if (!visible) return
    setNow(Date.now())
    const timer = interval(30_000, () => setNow(Date.now()))
    onCleanup(() => timer.cancel())
  })
  const monitors = Gdk.Display.get_default()!.get_monitors()
  const changed = monitors.connect("items-changed", () => {
    const current = monitor.peek()
    if (current && !app.get_monitors().includes(current)) close(true)
  })
  onCleanup(() => {
    monitors.disconnect(changed)
    volumeOsd.setPanelVisible(false)
    cancelWeatherRefresh()
    if (tick !== undefined) window.remove_tick_callback(tick)
    window.destroy()
    backdrop.destroy()
  })

  return {
    monitor,
    close,
    toggle(output?: Gdk.Monitor) {
      const current =
        output ??
        app.get_monitors().find((candidate) => candidate.connector === focusedOutput()) ??
        app.get_monitors()[0]
      if (!current) return
      if (monitor.peek() === current) close()
      else show(current)
    },
  }
}
