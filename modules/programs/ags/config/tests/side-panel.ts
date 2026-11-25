// direnv exec . ags run tests/side-panel.ts --gtk 4
// Temporary surfaces and fake power/weather; never schedules or executes a power action.
import app from "ags/gtk4/app"
import { createRoot, createState } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import Wp from "gi://AstalWp?version=0.1"
import GLib from "gi://GLib?version=2.0"
import { timeout } from "ags/time"
import { createSidePanel } from "../side-panel/SidePanel"
import { createVolumeOsd } from "../services/volume-osd"
import type { createPower } from "../services/power"
import type { createWeather } from "../services/weather"
import type { Forecast, WeatherLocation } from "../services/weather-state"
import type { ShutdownSchedule } from "../services/power-state"
import { registerOverlay } from "../widgets/overlays"
import { texturePixels } from "./texture-pixels"
import style from "../style.scss"

const wait = (ms: number) => new Promise<void>((resolve) => timeout(ms, resolve))
function check(value: unknown, message: string) {
  if (!value) throw new Error(message)
}
function widgets(root: Gtk.Widget): Gtk.Widget[] {
  const result = [root]
  for (let child = root.get_first_child(); child; child = child.get_next_sibling())
    result.push(...widgets(child))
  return result
}

function entryFrame(entry: Gtk.Entry, window: Gtk.Window) {
  const snapshot = new Gtk.Snapshot()
  new Gtk.WidgetPaintable({ widget: entry }).snapshot(
    snapshot,
    entry.get_width(),
    entry.get_height(),
  )
  const node = snapshot.to_node()
  check(node, "The entry produced no visible text or cursor")
  const texture = window.get_renderer()!.render_texture(node!, entry.compute_bounds(entry)[1])
  return texturePixels(texture)
}

function paintedHeight(frame: ReturnType<typeof entryFrame>) {
  let top = frame.height
  let bottom = -1
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++)
      if (frame.pixels[y * frame.stride + x * frame.channels + 3] > 32) {
        top = Math.min(top, y)
        bottom = Math.max(bottom, y)
      }
  return bottom < top ? 0 : bottom - top + 1
}

async function checkReadoutCursor(
  entry: Gtk.Entry,
  sample: string,
  other: Gtk.Widget,
  window: Gtk.Window,
) {
  const original = entry.text
  entry.text = sample
  other.grab_focus()
  await wait(30)
  const reference = entryFrame(entry, window)
  entry.grab_focus()
  entry.set_position(-1)
  await wait(30)
  const focused = entryFrame(entry, window)
  check(
    focused.width === reference.width && focused.height === reference.height,
    "Shortening the cursor should not resize the number field",
  )
  const text = entry.get_delegate() as Gtk.Text
  const [cursor] = text.compute_cursor_extents(entry.cursor_position)
  const cursorX = text.compute_bounds(entry)[1].get_x() + cursor!.get_x()
  for (let y = 0; y < reference.height; y++)
    for (let x = 0; x < reference.width; x++) {
      if (Math.abs(x - cursorX) <= 8) continue
      for (let c = 0; c < reference.channels; c++)
        check(
          reference.pixels[y * reference.stride + x * reference.channels + c] ===
            focused.pixels[y * focused.stride + x * focused.channels + c],
          "Shortening the cursor must not clip or move the numbers",
        )
    }
  entry.text = ""
  await wait(30)
  const cursorHeight = paintedHeight(entryFrame(entry, window))
  const numberHeight = paintedHeight(reference)
  check(
    cursorHeight >= numberHeight * 0.9 && cursorHeight <= numberHeight * 1.2,
    `Cursor height should match the digits, rather than the full line: ${cursorHeight}/${numberHeight}`,
  )
  entry.text = original
  entry.select_region(0, -1)
}

app.start({
  instanceName: "side-panel-smoke",
  css: style,
  async main() {
    // Keep the native cursor visible for the rendered height checks.
    Gtk.Settings.get_default()!.gtk_cursor_blink = false
    let dispose = () => {}
    try {
      let panel!: ReturnType<typeof createSidePanel>
      let setForecast!: (value: Forecast | null) => void
      let setLocation!: (value: WeatherLocation | null) => void
      let setWeatherUpdatedAt!: (value: number) => void
      let setSchedule!: (value: ShutdownSchedule | null) => void
      let dismissPanel!: () => void
      let launched: Gdk.Monitor | undefined
      const scheduleRequests: number[] = []
      let weatherRefreshes = 0
      let refreshedWhileSliding = false
      createRoot((cleanup) => {
        dispose = cleanup
        const [schedule, updateSchedule] = createState<ShutdownSchedule | null>(null)
        setSchedule = updateSchedule
        const power: ReturnType<typeof createPower> = {
          available: createState(true)[0],
          schedule,
          busy: createState(false)[0],
          error: createState("")[0],
          refresh: async () => {},
          scheduleShutdown: async (when) => {
            scheduleRequests.push(when)
            updateSchedule({ type: "poweroff", when })
            return true
          },
          cancelShutdown: async () => false,
          act: async () => {
            throw new Error("Power actions must not run in a smoke test")
          },
        }
        const [location, updateLocation] = createState<WeatherLocation | null>(null)
        const [forecast, updateForecast] = createState<Forecast | null>(null)
        const [updatedAt, updateUpdatedAt] = createState(Date.now())
        setForecast = updateForecast
        setLocation = updateLocation
        setWeatherUpdatedAt = updateUpdatedAt
        const weather: ReturnType<typeof createWeather> = {
          location,
          forecast,
          updatedAt,
          busy: createState(false)[0],
          error: createState("")[0],
          results: createState<WeatherLocation[]>([])[0],
          searching: createState(false)[0],
          searchError: createState("")[0],
          refresh: async () => {
            weatherRefreshes++
            const window = app.get_window("panel") as Astal.Window
            refreshedWhileSliding ||= window.margin_right !== 0
            updateUpdatedAt(Date.now())
          },
          search: async () => {},
          select: () => {},
        }
        panel = createSidePanel({
          power,
          weather,
          volumeOsd: createVolumeOsd(),
          focusedOutput: () => undefined,
          openWallpapers: (monitor) => {
            launched = monitor
          },
        })
        dismissPanel = registerOverlay(() => {})
      })

      const window = app.get_window("panel") as Astal.Window
      // Cursor snapshots need the output that actually receives keyboard focus.
      let activeMonitor: Gdk.Monitor | undefined
      for (const monitor of app.get_monitors()) {
        panel.toggle(monitor)
        await wait(350)
        check(
          window.visible && panel.monitor.peek() === monitor,
          "Panel did not open on the requested monitor",
        )
        check(
          window.get_height() === monitor.get_geometry().height,
          "Panel does not span the full monitor height",
        )
        check(
          window.get_width() <= 440,
          `Panel overflowed its intended width: ${window.get_width()}`,
        )
        check(window.margin_right === 0, "Panel did not finish sliding in")
        if (window.is_active) activeMonitor = monitor
        panel.toggle(monitor)
        await wait(300)
        check(!window.visible, "Toggle did not close the panel")
      }
      const monitor = activeMonitor ?? app.get_monitors()[0]
      check(monitor, "No Wayland monitor is available")
      setLocation({ id: 1, name: "Test city", detail: "Test region", latitude: 0, longitude: 0 })
      const now = Math.floor(Date.now() / 1000)
      setForecast({
        timezone: "Asia/Tokyo",
        current: { time: now, temperature: 12, feelsLike: 10, wind: 8, code: 0, day: false },
        hours: [0, 1, 2, 3, 4, 5].map((index) => ({
          time: now + index * 3600,
          temperature: 12 - index,
          rain: index * 10,
          code: 2,
          day: false,
        })),
        days: [0, 1, 2, 3, 4].map((index) => ({
          time: now + index * 86400,
          high: 15,
          low: 8,
          code: 2,
          sunrise: now,
          sunset: now + 36000,
        })),
      })
      setSchedule({ type: "poweroff", when: Date.now() + 94 * 60_000 + 20_000 })
      setWeatherUpdatedAt(0)
      panel.toggle(monitor)
      check(weatherRefreshes === 0, "Opening must not initialize weather during the slide")
      panel.close(true)
      await wait(250)
      check(weatherRefreshes === 0, "Closing during the slide must cancel the pending refresh")
      panel.toggle(monitor)
      await wait(350)
      check(
        weatherRefreshes === 1 && !refreshedWhileSliding,
        "Stale weather should refresh once after the panel finishes sliding in",
      )
      check(window.get_width() <= 440, "Loaded weather or schedule stretched the panel")
      const all = widgets(window)
      const outputs = all.find((widget) => widget.has_css_class("audio-outputs"))!
      const outputSelector = all.find(
        (widget) => widget instanceof Gtk.Button && widget.has_css_class("output-selector"),
      ) as Gtk.Button
      check(!outputs.get_mapped(), "Audio output choices should start collapsed")
      if (outputSelector.sensitive) {
        outputSelector.emit("clicked")
        await wait(200)
        check(outputs.get_mapped(), "Audio output selector did not reveal its choices")
        const choices = widgets(outputs).filter((widget) => widget instanceof Gtk.Button)
        check(
          choices.length === (Wp.get_default()!.audio.speakers?.length ?? 0) - 1,
          "The current output must appear only once, in the always-visible selector row",
        )
        panel.toggle(monitor)
        await wait(250)
        panel.toggle(monitor)
        await wait(250)
        check(!outputs.get_mapped(), "Audio output choices should collapse when the panel closes")
      }
      const schedule = all.find(
        (widget) => widget instanceof Gtk.Label && widget.label.includes("remaining"),
      )
      check(schedule?.get_mapped(), "Scheduled shutdown is not visible inside the panel")
      const reschedule = all.find(
        (widget) => widget instanceof Gtk.Button && widget.label === "Reschedule",
      ) as Gtk.Button
      reschedule.emit("clicked")
      await wait(250)
      check(
        window.get_height() === monitor.get_geometry().height,
        "Expanded scheduling overflowed the monitor",
      )
      check(
        window.get_width() <= 440,
        "The expanded duration readout stretched the panel beyond its intended width",
      )
      const minutes = all.find(
        (widget) => widget instanceof Gtk.Entry && widget.has_css_class("shutdown-minutes"),
      ) as Gtk.Entry
      const preview = all.find(
        (widget) => widget instanceof Gtk.Label && widget.has_css_class("schedule-preview"),
      ) as Gtk.Label
      const durationMode = all.find(
        (widget) => widget instanceof Gtk.ToggleButton && widget.label === "In minutes",
      ) as Gtk.ToggleButton
      const timeMode = all.find(
        (widget) => widget instanceof Gtk.ToggleButton && widget.label === "At a time",
      ) as Gtk.ToggleButton
      const control = all.find((widget) => widget.has_css_class("schedule-control"))!
      const adjust = (label: string) =>
        all.find((widget) => widget instanceof Gtk.Button && widget.label === label) as Gtk.Button
      const bounds = (widget: Gtk.Widget) => widget.compute_bounds(control)[1]
      check(
        control.get_width() < window.get_width() - 50,
        "The integrated control should leave space on both sides of the panel",
      )
      for (const [top, bottom] of [
        ["−5", "−1"],
        ["+5", "+1"],
      ]) {
        const upper = bounds(adjust(top))
        const lower = bounds(adjust(bottom))
        check(
          Math.abs(upper.get_y() - 1) <= 1 &&
            Math.abs(upper.get_y() + upper.get_height() - lower.get_y()) <= 1 &&
            Math.abs(lower.get_y() + lower.get_height() - (control.get_height() - 1)) <= 1,
          "Five-minute buttons must be above one-minute buttons and share the full side height",
        )
        check(
          top === "−5"
            ? Math.abs(upper.get_x() - 1) <= 1
            : Math.abs(upper.get_x() + upper.get_width() - (control.get_width() - 1)) <= 1,
          "Adjustment buttons must be flush with the control's outer edges",
        )
      }
      const presets = all.find((widget) => widget.has_css_class("schedule-presets"))!
      const presetBounds = bounds(presets)
      const left = bounds(adjust("−5"))
      const right = bounds(adjust("+5"))
      check(
        presetBounds.get_x() >= left.get_x() + left.get_width() &&
          presetBounds.get_x() + presetBounds.get_width() <= right.get_x() &&
          presetBounds.get_y() >= bounds(minutes).get_y() + minutes.get_height() &&
          presetBounds.get_y() + presetBounds.get_height() < control.get_height(),
        "Quick starts must sit inside the center, beneath the duration",
      )
      check(
        durationMode.get_mapped() &&
          timeMode.get_mapped() &&
          durationMode.active &&
          !timeMode.active,
        "Both scheduling modes should be visible, with duration selected initially",
      )
      check(
        minutes.get_mapped() && minutes.text === "95",
        "Rescheduling should open with remaining minutes rounded up",
      )
      check(
        Boolean(minutes.get_state_flags() & Gtk.StateFlags.FOCUS_WITHIN),
        "Opening the scheduler should focus the minutes field",
      )
      check(
        control.has_css_class("focused"),
        "The integrated control should indicate keyboard focus",
      )
      minutes.text = "0"
      minutes.emit("activate")
      await wait(20)
      check(scheduleRequests.length === 0, "An invalid duration must not schedule a shutdown")
      for (const duration of [88, 95]) {
        const before = Date.now()
        minutes.text = String(duration)
        const expectedClocks = [before, Date.now()].map((value) =>
          GLib.DateTime.new_from_unix_local(Math.floor((value + duration * 60_000) / 1000)).format(
            "%H:%M",
          )!,
        )
        check(
          preview.get_mapped() && expectedClocks.some((clock) => preview.label.includes(clock)),
          "The duration should preview its resulting local clock time",
        )
        minutes.emit("activate")
        await wait(20)
        const when = scheduleRequests.at(-1)!
        check(
          when >= before + duration * 60_000 && when <= Date.now() + duration * 60_000,
          "Enter should schedule the entered number of minutes",
        )
        check(
          scheduleRequests.length === (duration === 88 ? 1 : 2),
          "A single Enter should submit the duration once",
        )
        reschedule.emit("clicked")
        await wait(200)
      }
      timeMode.emit("clicked")
      await wait(20)
      const date = all.find(
        (widget) => widget instanceof Gtk.Entry && widget.placeholder_text === "YYYY-MM-DD",
      ) as Gtk.Entry
      const time = all.find(
        (widget) => widget instanceof Gtk.Entry && widget.has_css_class("shutdown-time"),
      ) as Gtk.Entry
      check(
        control.has_css_class("focused"),
        "Switching to time entry should preserve the control's focus indicator",
      )
      check(
        !minutes.get_mapped() &&
          date.get_mapped() &&
          time.get_mapped() &&
          timeMode.active &&
          !durationMode.active,
        "Specific-time mode should reveal the date and time fields",
      )
      check(
        window.get_width() <= 440,
        "The expanded clock and date stretched the panel beyond its intended width",
      )
      await checkReadoutCursor(time, "12:34", durationMode, window)
      date.text = "2099-12-31"
      time.text = "23:58"
      adjust("+5").emit("clicked")
      check(
        date.text === "2100-01-01" && time.text === "00:03",
        "Clock adjustments across midnight must also update the date",
      )
      adjust("−5").emit("clicked")
      check(
        date.text === "2099-12-31" && time.text === "23:58",
        "Subtracting across midnight must restore the previous date",
      )
      for (const [label, days] of [
        ["Today", 0],
        ["Tomorrow", 1],
      ] as const) {
        const button = all.find(
          (widget) => widget instanceof Gtk.Button && widget.label === label,
        ) as Gtk.Button
        button.emit("clicked")
        check(
          date.text === GLib.DateTime.new_now_local().add_days(days)!.format("%F"),
          "The date shortcuts should choose the current local day or the following day",
        )
      }
      durationMode.emit("clicked")
      await wait(20)
      check(
        minutes.get_mapped() && minutes.text === "95" && durationMode.active && !timeMode.active,
        "Changing modes should preserve the entered duration and update the selected mode",
      )
      check(
        control.has_css_class("focused"),
        "Returning to duration entry should preserve the control's focus indicator",
      )
      timeMode.emit("clicked")
      await wait(20)
      const future = GLib.DateTime.new_now_local().add_hours(2)!
      date.text = future.format("%F")!
      time.text = future.format("%H:%M")!
      time.emit("activate")
      await wait(20)
      check(
        scheduleRequests.at(-1) === (future.to_unix() - future.get_second()) * 1000,
        "Specific-time mode must still schedule the selected local date and time",
      )
      setSchedule(null)
      await wait(20)
      const newSchedule = all.find(
        (widget) =>
          widget instanceof Gtk.Button &&
          widget.get_mapped() &&
          widgets(widget).some(
            (child) => child instanceof Gtk.Label && child.label === "Schedule shutdown",
          ),
      ) as Gtk.Button
      newSchedule.emit("clicked")
      await wait(200)
      check(
        minutes.get_mapped() && minutes.text === "" && !preview.get_mapped(),
        "A new schedule should start with an empty duration and no stale deadline preview",
      )
      const apply = all.find(
        (widget) => widget instanceof Gtk.Button && widget.has_css_class("schedule-submit"),
      ) as Gtk.Button
      check(
        control.has_css_class("focused") && !apply.sensitive,
        "An empty draft should show focus on its control and disable the schedule button",
      )
      check(
        minutes.placeholder_text === "",
        "The focused empty duration should show its cursor without the dash placeholder",
      )
      durationMode.grab_focus()
      await wait(20)
      check(
        minutes.text === "" && minutes.placeholder_text === "—",
        "The empty duration should restore its placeholder when focus leaves the field",
      )
      minutes.grab_focus()
      await wait(20)
      check(
        minutes.text === "" && minutes.placeholder_text === "",
        "Returning focus should hide the placeholder without filling the duration",
      )
      await checkReadoutCursor(minutes, "95", durationMode, window)
      const requestsBeforeMouse = scheduleRequests.length
      const preset = (value: number) =>
        all.find(
          (widget) =>
            widget instanceof Gtk.Button &&
            widget.tooltip_text === `Set duration to ${value} minutes`,
        ) as Gtk.Button
      adjust("+1").emit("clicked")
      check(minutes.text === "1", "Mouse adjustment should work from an empty duration")
      for (const value of [30, 60]) {
        preset(value).emit("clicked")
        check(
          minutes.text === String(value) && preview.get_mapped(),
          "A preset should populate the editable duration and its preview",
        )
      }
      preset(60).emit("clicked")
      for (let i = 0; i < 6; i++) adjust("+5").emit("clicked")
      adjust("−1").emit("clicked")
      adjust("−1").emit("clicked")
      check(
        minutes.text === "88",
        "Mouse adjustments should support arbitrary durations such as 88 minutes",
      )
      adjust("+1").emit("clicked")
      check(minutes.text === "89", "The one-minute increment should edit the duration")
      preset(30).emit("clicked")
      for (let i = 0; i < 6; i++) adjust("−5").emit("clicked")
      check(
        minutes.text === "1" && !adjust("−1").sensitive && !adjust("−5").sensitive,
        "Mouse adjustments must stop at one minute and disable further subtraction",
      )
      preset(60).emit("clicked")
      for (let i = 0; i < 7; i++) adjust("+5").emit("clicked")
      check(
        minutes.text === "95" && scheduleRequests.length === requestsBeforeMouse,
        "Presets and adjustments must edit the draft without scheduling it",
      )
      check(apply.sensitive, "A valid draft should enable the schedule button")
      const beforeMouseSchedule = Date.now()
      apply.emit("clicked")
      await wait(20)
      check(
        scheduleRequests.length === requestsBeforeMouse + 1 &&
          scheduleRequests.at(-1)! >= beforeMouseSchedule + 95 * 60_000 &&
          scheduleRequests.at(-1)! <= Date.now() + 95 * 60_000,
        "The schedule button should submit a duration composed entirely with mouse controls",
      )
      check(
        window.get_width() <= 440,
        "Duration controls stretched the panel beyond its intended width",
      )
      const wallpaper = all.find(
        (widget) => widget instanceof Gtk.Button && widget.has_css_class("wallpaper-shortcut"),
      ) as Gtk.Button
      wallpaper.emit("clicked")
      await wait(300)
      check(
        launched === monitor && !window.visible,
        "Wallpaper launch did not close the panel and preserve its monitor",
      )
      panel.toggle(monitor)
      await wait(250)
      dismissPanel()
      await wait(250)
      check(!window.visible, "Opening another overlay did not dismiss the panel")
      check(weatherRefreshes === 1, "Reopening with fresh weather should reuse the cached forecast")
      print("Side panel smoke test passed")
      dispose()
      app.quit(0)
    } catch (cause) {
      console.error(cause)
      dispose()
      app.quit(1)
    }
  },
})
