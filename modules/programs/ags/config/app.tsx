import app from "ags/gtk4/app"
import { createRoot, getScope, onCleanup } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import { readFile } from "ags/file"
import Bar from "./bar/Bar"
import VolumeOsd from "./osd/VolumeOsd"
import { createNiri } from "./services/niri"
import { createMpd } from "./services/mpd"
import { createSystemStats } from "./services/system"
import { createVolumeOsd } from "./services/volume-osd"
import { createWorldClocks } from "./services/world-clocks"
import { createWallpaperPicker } from "./wallpaper/WallpaperPicker"
import { createPower } from "./services/power"
import { createWeather } from "./services/weather"
import { createSidePanel } from "./side-panel/SidePanel"
import style from "./style.scss"

const themePath = `${GLib.get_user_config_dir()}/ags-theme.css`
const theme = GLib.file_test(themePath, GLib.FileTest.EXISTS) ? readFile(themePath) : ""
let wallpaperPicker: ReturnType<typeof createWallpaperPicker> | undefined
let toggleSidePanel: ((monitor?: Gdk.Monitor) => void) | undefined

app.start({
  css: `${style}\n${theme}`,
  requestHandler([command, output], response) {
    if (command === "reload-css") {
      const css = readFile(`${GLib.get_user_config_dir()}/ags-style.css`)
      app.apply_css(css, true)
      wallpaperPicker?.reloadCss(css)
      response("Styles reloaded")
    } else if (command === "wallpaper") {
      wallpaperPicker?.toggle()
      response("Wallpaper picker toggled")
    } else if (command === "panel") {
      const monitor = output
        ? app.get_monitors().find((monitor) => monitor.connector === output)
        : undefined
      if (output && !monitor) {
        response(`Unknown output: ${output}`)
        return
      }
      toggleSidePanel?.(monitor)
      response("Side panel toggled")
    } else {
      response("Unknown command")
    }
  },
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
      volumeOsd: createVolumeOsd(),
      worldClocks: createWorldClocks(),
    }

    const focusedOutput = () =>
      services.niri.state.peek().workspaces.find((workspace) => workspace.is_focused)?.output ??
      undefined
    wallpaperPicker = createWallpaperPicker(`${style}\n${theme}`, focusedOutput)
    const scope = getScope()
    let sidePanel: ReturnType<typeof createSidePanel> | undefined
    const togglePanel = (monitor?: Gdk.Monitor) => {
      // Event callbacks must attach these resources to the application's lifetime.
      const panel = (sidePanel ??= scope.run(() =>
        createSidePanel({
          power: createPower(),
          weather: createWeather(),
          volumeOsd: services.volumeOsd,
          focusedOutput,
          openWallpapers: (monitor) => wallpaperPicker?.open(monitor),
        }),
      ))
      panel.toggle(monitor)
    }
    toggleSidePanel = togglePanel

    const windows = new Map<Gdk.Monitor, () => void>()
    const monitors = Gdk.Display.get_default()!.get_monitors()
    function syncMonitors() {
      wallpaperPicker?.endPreview()
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
            app.add_window(Bar({ monitor, services, togglePanel }))
            if (monitor.connector === "DP-1") VolumeOsd({ monitor, volumeOsd: services.volumeOsd })
            windows.set(monitor, dispose)
          })
      }
    }
    const changed = monitors.connect("items-changed", syncMonitors)
    onCleanup(() => {
      toggleSidePanel = undefined
      monitors.disconnect(changed)
      for (const dispose of windows.values()) dispose()
    })
    syncMonitors()
  },
})
