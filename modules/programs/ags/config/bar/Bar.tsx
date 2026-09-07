import { Astal, Gdk } from "ags/gtk4"
import { onCleanup } from "ags"
import type { createNiri } from "../services/niri"
import type { createMpd } from "../services/mpd"
import type { createSystemStats } from "../services/system"
import Workspaces from "./Workspaces"
import WindowMap from "./WindowMap"
import KeyboardLayout from "./KeyboardLayout"
import Clock from "./Clock"
import Volume from "./Volume"
import Media from "./Media"
import SystemStats from "./SystemStats"
import Tray from "./Tray"

type Services = {
  niri: ReturnType<typeof createNiri>
  mpd: ReturnType<typeof createMpd>
  system: ReturnType<typeof createSystemStats>
}

export default function Bar({ monitor, services }: { monitor: Gdk.Monitor; services: Services }) {
  const output = monitor.connector ?? ""
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
      marginLeft={8}
      marginRight={8}
      heightRequest={30}
      $={(window) => onCleanup(() => window.destroy())}
    >
      <centerbox>
        <box $type="start">
          <Workspaces niri={services.niri} output={output} />
          <WindowMap
            niri={services.niri}
            output={output}
            outputHeight={monitor.get_geometry().height}
          />
          <Media mpd={services.mpd} />
        </box>
        <Clock $type="center" />
        <box $type="end" spacing={8}>
          <Volume />
          <KeyboardLayout niri={services.niri} />
          <SystemStats system={services.system} />
          <Tray />
        </box>
      </centerbox>
    </window>
  ) as Astal.Window
}
