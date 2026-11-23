// direnv exec . ags run tests/volume-slider.ts --gtk 4
// Uses fake volume state; never changes an audio device.
import app from "ags/gtk4/app"
import { createRoot, createState } from "ags"
import { Astal, Gtk } from "ags/gtk4"
import { timeout } from "ags/time"
import VolumeSlider from "../side-panel/VolumeSlider"
import { texturePixels } from "./texture-pixels"
import style from "../style.scss"

const wait = (ms: number) => new Promise<void>((resolve) => timeout(ms, resolve))
function check(value: unknown, message: string) {
  if (!value) throw new Error(message)
}

app.start({
  instanceName: "volume-slider-smoke",
  css: style,
  async main() {
    let dispose = () => {}
    let window: Astal.Window | undefined
    try {
      let slider!: Gtk.Overlay
      let setVolume!: (value: number) => void
      let setMute!: (value: boolean) => void
      const requests: number[] = []
      createRoot((cleanup) => {
        dispose = cleanup
        const [volume, updateVolume] = createState(0.75)
        const [mute, updateMute] = createState(false)
        setVolume = updateVolume
        setMute = updateMute
        slider = VolumeSlider({
          volume,
          mute,
          onChange(value) {
            requests.push(value)
            updateVolume(value)
          },
        })
        const content = new Gtk.Box({ css_classes: ["audio-card"], width_request: 340 })
        content.append(slider)
        window = new Astal.Window({
          namespace: "ags-volume-slider-smoke",
          layer: Astal.Layer.OVERLAY,
          exclusivity: Astal.Exclusivity.IGNORE,
          keymode: Astal.Keymode.NONE,
          child: content,
        })
        window.add_css_class("SidePanel")
        app.add_window(window)
      })
      window!.present()
      await wait(150)
      const scale = slider.get_child() as Gtk.Scale
      const bounds = scale.get_range_rect()
      check(bounds.width > 200, "Slider did not receive its intended track width")
      scale.unset_state_flags(
        Gtk.StateFlags.PRELIGHT | Gtk.StateFlags.FOCUS_VISIBLE | Gtk.StateFlags.ACTIVE,
      )
      await wait(160)

      function frame() {
        const snapshot = new Gtk.Snapshot()
        new Gtk.WidgetPaintable({ widget: slider }).snapshot(
          snapshot,
          slider.get_width(),
          slider.get_height(),
        )
        const node = snapshot.to_node()
        check(node, "Slider produced no visual content")
        const texture = window!.get_renderer()!.render_texture(node!, null)
        const { pixels, stride, channels } = texturePixels(texture)
        return (x: number, y = slider.get_height() / 2) => {
          const offset = Math.floor(y) * stride + Math.floor(x) * channels
          return Array.from(pixels.slice(offset, offset + channels))
        }
      }
      const normalEnd = bounds.x + Math.floor((bounds.width * 2) / 3)
      const center = normalEnd + 2.5
      const boostStart = normalEnd + 5
      const boostWidth = bounds.x + bounds.width - boostStart
      const bodyX = bounds.x + (normalEnd - bounds.x) * 0.4
      let pixels = frame()
      check(pixels(bodyX)[3] > 245, "Normal volume is not visibly filled")
      check(pixels(center)[3] === 0, "The 100% gap must remain empty")
      check(
        pixels(boostStart + boostWidth / 2)[3] < 40,
        "Normal volume incorrectly filled the boost segment",
      )

      setVolume(1.25)
      await wait(50)
      check(
        scale.get_value() === 1.25 && requests.length === 0,
        "External updates must refresh the control without changing audio",
      )
      check(slider.get_height() <= 28, "The invisible magnetic stop enlarged the slider")
      pixels = frame()
      check(pixels(center)[3] === 0, "Boost must not paint over the 100% gap")
      check(
        pixels(boostStart + boostWidth * 0.25)[3] > 245,
        "Boost volume did not fill its own segment",
      )
      check(pixels(boostStart + boostWidth * 0.75)[3] < 40, "Boost volume overfilled its segment")
      check(
        pixels(bodyX)
          .slice(0, 3)
          .some((value, index) => value !== pixels(boostStart + boostWidth * 0.25)[index]),
        "Normal and boost fills need distinct colors",
      )

      scale.emit("change-value", Gtk.ScrollType.JUMP, 0.75)
      await wait(50)
      check(
        requests.length === 1 && requests[0] === 0.75,
        "Native slider input did not reach the volume action",
      )
      for (const [start, direction, expected] of [
        [0.98, Gtk.ScrollType.PAGE_FORWARD, 1],
        [1.02, Gtk.ScrollType.PAGE_BACKWARD, 1],
        [1, Gtk.ScrollType.STEP_FORWARD, 1.01],
        [1, Gtk.ScrollType.STEP_BACKWARD, 0.99],
      ] as const) {
        setVolume(start)
        scale.emit("move-slider", direction)
        check(
          Math.abs(requests.at(-1)! - expected) < 0.000001,
          "Volume adjustment must stop at 100% when crossing it, and allow moving away",
        )
      }
      const requestCount = requests.length
      setVolume(0.995)
      check(
        scale.get_value() === 0.995 && requests.length === requestCount,
        "External volume changes must not be pulled into the magnetic stop",
      )
      setVolume(0.75)
      await wait(50)
      const resting = frame()
      const restingBody = resting(bodyX)
      const end = bounds.x + (normalEnd - bounds.x) * 0.75
      const capX = end - 10
      const cornerX = Math.floor(end) - 1
      const cornerY = (slider.get_height() - 22) / 2 + 4
      scale.set_state_flags(Gtk.StateFlags.PRELIGHT, false)
      await wait(180)
      const hovered = frame()
      check(
        hovered(bodyX).every((value, index) => value === restingBody[index]),
        "Hover changed the whole fill instead of just the tip",
      )
      check(
        hovered(capX).some((value, index) => value !== resting(capX)[index]),
        "Hover did not change the tip color",
      )
      check(
        hovered(cornerX, cornerY)[3] > resting(cornerX, cornerY)[3] + 100,
        "Hover did not square off the end cap",
      )

      setMute(true)
      await wait(50)
      check(frame()(bodyX)[3] < 100, "Mute did not update the displayed fill")
      for (const value of [0, 0.001, 1, 1.5]) {
        setVolume(value)
        await wait(30)
        check(frame()(center)[3] === 0, "A volume boundary painted over the split")
      }
      setMute(false)
      setVolume(1.5)
      await wait(50)
      const full = frame()
      const seamTop = (slider.get_height() - 22) / 2
      check(
        full(normalEnd - 1, seamTop)[3] === 0 && full(boostStart, seamTop)[3] === 0,
        "The facing corners at the split should be slightly rounded",
      )
      check(
        full(normalEnd - 2, seamTop + 4)[3] > 245 && full(boostStart + 1, seamTop + 4)[3] > 245,
        "The facing corners should not be as rounded as the outer ends",
      )
      check(
        [0, 1, 2, 3, 4].every((offset) => full(normalEnd + offset)[3] === 0),
        "The small gap must remain visible between the segments",
      )
      setMute(false)
      setVolume(1.25)
      await wait(50)
      const originalColor = frame()(bodyX)
      const originalBoost = frame()(boostStart + boostWidth * 0.25)
      app.apply_css("@define-color accent #40b8a0;")
      await wait(50)
      check(
        frame()(bodyX).some((value, index) => value !== originalColor[index]),
        "A live accent change did not repaint the volume track",
      )
      check(
        frame()(boostStart + boostWidth * 0.25).some(
          (value, index) => value !== originalBoost[index],
        ),
        "A live accent change did not repaint the boost fill",
      )
      const updatedColor = frame()(bodyX)
      const updatedBoost = frame()(boostStart + boostWidth * 0.25)
      app.apply_css("@define-color urgent #6e98e8;")
      await wait(50)
      check(
        frame()(bodyX).every((value, index) => value === updatedColor[index]),
        "Changing the boost warning color must not repaint normal volume",
      )
      check(
        frame()(boostStart + boostWidth * 0.25).some(
          (value, index) => value !== updatedBoost[index],
        ),
        "A live warning color change did not repaint the boost fill",
      )
      print("Volume slider smoke test passed")
      dispose()
      window!.destroy()
      app.quit(0)
    } catch (cause) {
      console.error(cause)
      dispose()
      window?.destroy()
      app.quit(1)
    }
  },
})
