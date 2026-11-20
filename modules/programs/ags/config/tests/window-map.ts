// Run from the AGS config directory: direnv exec . ags run tests/window-map.ts --gtk 4
// Opens temporary test surfaces on each monitor using fake Niri state.
import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import Graphene from "gi://Graphene?version=1.0"
import { createRoot, createState } from "ags"
import { timeout } from "ags/time"
import WindowMap from "../bar/WindowMap"
import { barBounds } from "../widgets/PopupWindow"
import { emptyNiriState } from "../services/niri-state"
import { fitWindowMap } from "../services/window-map"
import style from "../style.scss"

const wait = (ms: number) => new Promise<void>((resolve) => timeout(ms, resolve))
function check(value: unknown, message: string) {
  if (!value) throw new Error(message)
}
const tiles = () =>
  app
    .get_windows()
    .filter(
      (w): w is Astal.Window => w instanceof Astal.Window && w.namespace === "ags-window-map-tile",
    )

app.start({
  instanceName: "window-map-smoke",
  css: style,
  async main() {
    let cleanup = () => {}
    try {
      for (const monitor of app.get_monitors()) {
        const output = monitor.connector!
        const windows = [
          { id: 10, column: 1, row: 1, height: 540 },
          { id: 20, column: 1, row: 2, height: 540 },
          { id: 30, column: 2, row: 1, height: 1080 },
        ].map(({ id, column, row, height }) => ({
          id,
          workspace_id: 1,
          is_focused: id === 10,
          is_floating: false,
          is_urgent: id === 20,
          layout: {
            pos_in_scrolling_layout: [column, row] as [number, number],
            tile_size: [960, height] as [number, number],
            tile_pos_in_workspace_view: [16 + (column - 1) * 976, 16] as [number, number],
          },
        }))
        const initial = {
          ...emptyNiriState,
          workspaces: [
            {
              id: 1,
              idx: 1,
              name: null,
              output,
              is_active: true,
              is_focused: true,
              is_urgent: false,
              active_window_id: 10,
            },
          ],
          windows,
        }
        const [state, setState] = createState(initial)
        let map: Gtk.Widget
        let dispose = () => {}
        createRoot((destroy) => {
          dispose = destroy
          map = WindowMap({
            niri: { state },
            output,
            outputWidth: 1960,
            outputHeight: 1080,
          })
        })
        const prefix = new Gtk.Box({ width_request: 80 })
        const content = new Gtk.Box()
        content.append(prefix)
        content.append(map!)
        const bar = new Astal.Window({
          namespace: "ags-window-map-smoke",
          css_classes: ["Bar"],
          gdkmonitor: monitor,
          anchor: Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT,
          layer: Astal.Layer.TOP,
          exclusivity: Astal.Exclusivity.IGNORE,
          keymode: Astal.Keymode.NONE,
          margin_left: 8,
          margin_bottom: 40,
          height_request: 30,
          child: content,
        })
        app.add_window(bar)
        cleanup = () => {
          dispose()
          bar.destroy()
        }
        bar.present()
        await wait(600)
        check(tiles().length === 3, "Expected three tile surfaces")
        let layout = fitWindowMap([windows.slice(0, 2), windows.slice(2)], 1080, 24)
        function checkGeometry() {
          const bounds = barBounds(map!)!
          check(bounds.height === 30, "Viewport line and tiles should fit inside the 30px bar")
          for (const expected of layout.tiles) {
            const window = tiles().find((w) => w.name.endsWith(`-${expected.window.id}`))!
            check(window?.get_mapped(), `Tile ${expected.window.id} was not mapped on ${output}`)
            check(
              window.get_width() === expected.width && window.get_height() === expected.height,
              `Wrong tile size on ${output}: ${window.get_width()}x${window.get_height()}, expected ${expected.width}x${expected.height}`,
            )
            check(
              window.margin_left === Math.round(bounds.x + expected.x) &&
                window.margin_top === Math.round(bounds.y + 3 + expected.y),
              "Tile placement differs from reserved map bounds",
            )
            check(window.gdkmonitor === monitor, "Tile appeared on the wrong monitor")
          }
        }
        checkGeometry()
        function viewportAlpha() {
          const width = map!.get_width()
          const height = map!.get_height()
          const snapshot = new Gtk.Snapshot()
          Gtk.WidgetPaintable.new(map!).snapshot(snapshot, width, height)
          const node = snapshot.to_node()
          if (!node) return () => 0
          const texture = bar
            .get_renderer()!
            .render_texture(node, new Graphene.Rect().init(0, 0, width, height))
          const downloader = Gdk.TextureDownloader.new(texture)
          downloader.set_format(Gdk.MemoryFormat.R8G8B8A8)
          const [bytes, stride] = downloader.download_bytes()
          const pixels = bytes.get_data()!
          return (x: number, y: number) => pixels[y * stride + 4 * x + 3]
        }
        check(viewportAlpha()(9, 0) === 0, "Marker should be hidden when all tiles fit")
        const panned = windows.map((window) => {
          const [x, y] = window.layout.tile_pos_in_workspace_view
          return {
            ...window,
            layout: {
              ...window.layout,
              tile_pos_in_workspace_view: [x - 416, y] as [number, number],
            },
          }
        })
        setState({ ...initial, windows: panned })
        await wait(300)
        const pannedAlpha = viewportAlpha()
        check(
          pannedAlpha(0, 0) === 0 && pannedAlpha(9, 0) > 0,
          "Panning a tile partly out of view should show the marker at the new position",
        )
        check(
          pannedAlpha(9, 1) > 0 && pannedAlpha(9, 2) === 0,
          "Marker should be 2px high with a 1px gap before the tiles",
        )
        checkGeometry()
        setState(initial)
        prefix.width_request = 110
        await wait(300)
        check(viewportAlpha()(9, 0) === 0, "Marker should hide again when all tiles fit")
        checkGeometry()
        const shorter = windows.map((window) =>
          window.id === 30
            ? { ...window, layout: { ...window.layout, tile_size: [960, 540] as [number, number] } }
            : window,
        )
        setState({ ...initial, windows: shorter })
        layout = fitWindowMap([shorter.slice(0, 2), shorter.slice(2)], 1080, 24)
        await wait(350)
        checkGeometry()
        setState(initial)
        layout = fitWindowMap([windows.slice(0, 2), windows.slice(2)], 1080, 24)
        await wait(350)
        checkGeometry()
        map!.set_visible(false)
        await wait(100)
        check(
          tiles().every((w) => !w.visible),
          "Unmapping the bar left tile surfaces visible",
        )
        map!.set_visible(true)
        await wait(150)
        checkGeometry()
        setState({ ...initial, windows: [] })
        await wait(350)
        check(
          tiles().length === 0 && map!.get_width() === 0,
          "Closing all windows left tile surfaces or reserved space",
        )
        setState(initial)
        await wait(350)
        checkGeometry()
        setState({
          ...initial,
          workspaces: initial.workspaces.map((w) => ({ ...w, id: 2 })),
          windows: windows.map((w) => ({ ...w, workspace_id: 2 })),
        })
        await wait(150)
        check(tiles().length === 3, "Workspace switch leaked or dropped tile surfaces")
        checkGeometry()
        cleanup()
        cleanup = () => {}
        check(tiles().length === 0, "Disposal left tile windows registered")
        print(
          `PASS: viewport marker, tile geometry, bar movement, visibility, empty map, workspace switch and disposal on ${output}`,
        )
      }
      app.quit()
    } catch (error) {
      console.error(error)
      cleanup()
      app.quit(1)
    }
  },
})
