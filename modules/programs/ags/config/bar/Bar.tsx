import { Astal, Gdk, Gtk } from "ags/gtk4"
import { onCleanup } from "ags"
import type { createNiri } from "../services/niri"
import type { createMpd } from "../services/mpd"
import type { createSystemStats } from "../services/system"
import type { createVolumeOsd } from "../services/volume-osd"
import type { createWorldClocks } from "../services/world-clocks"
import Workspaces from "./Workspaces"
import WindowMap from "./WindowMap"
import KeyboardLayout from "./KeyboardLayout"
import Clock from "./Clock"
import Volume from "./Volume"
import Media from "./Media"
import SystemStats from "./SystemStats"
import Tray from "./Tray"
import type { createSidePanel } from "../side-panel/SidePanel"

type Services = {
  niri: ReturnType<typeof createNiri>
  mpd: ReturnType<typeof createMpd>
  system: ReturnType<typeof createSystemStats>
  volumeOsd: ReturnType<typeof createVolumeOsd>
  worldClocks: ReturnType<typeof createWorldClocks>
}

export default function Bar({
  monitor,
  services,
  sidePanel,
}: {
  monitor: Gdk.Monitor
  services: Services
  sidePanel: ReturnType<typeof createSidePanel>
}) {
  const output = monitor.connector ?? ""
  const { width, height } = monitor.get_geometry()
  return (
    <window
      visible
      name={`bar-${monitor.connector}`}
      namespace="ags-bar"
      class="Bar"
      gdkmonitor={monitor}
      anchor={Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT}
      layer={Astal.Layer.TOP}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      keymode={Astal.Keymode.NONE}
      heightRequest={30}
      $={(window: Astal.Window) => onCleanup(() => window.destroy())}
    >
      <centerbox>
        <box $type="start" marginStart={8}>
          <Workspaces niri={services.niri} output={output} />
          <WindowMap
            niri={services.niri}
            output={output}
            outputWidth={width}
            outputHeight={height}
          />
          <Media mpd={services.mpd} />
        </box>
        <Clock $type="center" worldClocks={services.worldClocks} />
        <box $type="end" spacing={8}>
          <Tray />
          <Volume output={output} volumeOsd={services.volumeOsd} />
          <KeyboardLayout niri={services.niri} />
          <SystemStats system={services.system} />
          <button
            class="PanelToggle"
            focusable={false}
            tooltipText="Control center (Super+,)"
            $={(button: Gtk.Button) =>
              button.update_property([Gtk.AccessibleProperty.LABEL], ["Control center"])
            }
            onClicked={() => sidePanel.toggle(monitor)}
          >
            <box class="panel-rail" halign={Gtk.Align.END} valign={Gtk.Align.FILL} />
          </button>
        </box>
      </centerbox>
    </window>
  ) as Astal.Window
}
