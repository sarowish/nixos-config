import app from "ags/gtk4/app"
import { createRoot, onCleanup } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import { readFile } from "ags/file"
import Bar from "./bar/Bar"
import { createNiri } from "./services/niri"
import { createMpd } from "./services/mpd"
import { createSystemStats } from "./services/system"
import style from "./style.scss"

const themePath = `${GLib.get_user_config_dir()}/ags-theme.css`
const theme = GLib.file_test(themePath, GLib.FileTest.EXISTS) ? readFile(themePath) : ""

app.start({
  css: `${style}\n${theme}`,
  main() {
    const settings = Gtk.Settings.get_default()
    if (settings) {
      settings.gtk_font_rendering = Gtk.FontRendering.MANUAL
      settings.gtk_hint_font_metrics = true
    }

    const services = {
      niri: createNiri(),
      mpd: createMpd(),
      system: createSystemStats(),
    }

    const windows = new Map<Gdk.Monitor, () => void>()
    const monitors = Gdk.Display.get_default()!.get_monitors()
    function syncMonitors() {
      const current = app.get_monitors()
      for (const [monitor, dispose] of windows) {
        if (!current.includes(monitor)) {
          dispose()
          windows.delete(monitor)
        }
      }
      for (const monitor of current) {
        if (!windows.has(monitor))
          createRoot((dispose) => {
            app.add_window(Bar({ monitor, services }))
            windows.set(monitor, dispose)
          })
      }
    }
    const changed = monitors.connect("items-changed", syncMonitors)
    onCleanup(() => {
      monitors.disconnect(changed)
      for (const dispose of windows.values()) dispose()
    })
    syncMonitors()
  },
})
