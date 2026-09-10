import { createComputed, createEffect, createState, onCleanup } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import Cairo from "cairo"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import type { createNiri } from "../services/niri"
import type { createVolumeOsd } from "../services/volume-osd"

const MAX_VOLUME = 1.5
const TRACK_HEIGHT = 350
const MIN_FILL_HEIGHT = 48
const ICON_HEIGHT = 30
const ICON_TOP_INSET = 8
const VOLUME_DURATION_US = 180_000

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function VolumeOsd({
  monitor,
  niri,
  volumeOsd,
}: {
  monitor: Gdk.Monitor
  niri: ReturnType<typeof createNiri>
  volumeOsd: ReturnType<typeof createVolumeOsd>
}) {
  const output = monitor.connector ?? ""
  const focused = niri.state(({ workspaces }) =>
    workspaces.some((workspace) => workspace.output === output && workspace.is_focused),
  )
  const targetVolume = createComputed(() =>
    volumeOsd.mute() ? 0 : clamp(volumeOsd.volume(), 0, MAX_VOLUME),
  )
  const [animatedVolume, setAnimatedVolume] = createState(targetVolume())
  const fillHeight = animatedVolume.as((volume) =>
    Math.max(MIN_FILL_HEIGHT, Math.round(clamp(volume, 0, 1) * TRACK_HEIGHT)),
  )
  const overflowHeight = animatedVolume.as((volume) =>
    Math.round(clamp((volume - 1) / (MAX_VOLUME - 1), 0, 1) * TRACK_HEIGHT),
  )
  const iconOffset = fillHeight.as((height) => height - ICON_HEIGHT - ICON_TOP_INSET)
  const percentageHeight = iconOffset.as((height) => Math.max(0, height - 8))
  const showPercentage = createComputed(() => !volumeOsd.mute() && percentageHeight() >= 32)
  const percentage = createComputed(() => `${Math.round(volumeOsd.volume() * 100)}%`)

  const icon = new Gtk.DrawingArea({
    css_classes: ["volume-icon"],
    height_request: ICON_HEIGHT,
    hexpand: true,
    valign: Gtk.Align.END,
  })
  let muted = volumeOsd.mute()
  let iconVolume = volumeOsd.volume()
  icon.set_draw_func((widget, cr, width, height) => {
    const color = widget.get_color()
    cr.translate((width - 32) / 2, (height - 32) / 2)
    const ink = (alpha = 1) =>
      cr.setSourceRGBA(color.red, color.green, color.blue, color.alpha * alpha)
    ink()
    cr.moveTo(3, 12)
    cr.lineTo(8, 12)
    cr.lineTo(15, 6)
    cr.curveTo(16, 5, 17, 6, 17, 7)
    cr.lineTo(17, 25)
    cr.curveTo(17, 26, 16, 27, 15, 26)
    cr.lineTo(8, 20)
    cr.lineTo(3, 20)
    cr.closePath()
    cr.fill()
    cr.setLineWidth(2.8)
    cr.setLineCap(Cairo.LineCap.ROUND)
    if (muted) {
      cr.moveTo(22, 12)
      cr.lineTo(29, 20)
      cr.moveTo(29, 12)
      cr.lineTo(22, 20)
      cr.stroke()
    } else {
      ink(iconVolume >= 1 / 3 ? 1 : 0.4)
      cr.arc(16, 16, 8, -Math.PI / 4, Math.PI / 4)
      cr.stroke()
      // Match the displayed percentage, including rounding near 100%.
      if (Math.round(iconVolume * 100) > 100) {
        cr.moveTo(29, 7)
        cr.lineTo(29, 18)
        cr.stroke()
        cr.arc(29, 24, 1.6, 0, 2 * Math.PI)
        cr.fill()
      } else {
        ink(iconVolume >= 2 / 3 ? 1 : 0.4)
        cr.arc(16, 16, 14, -Math.PI / 4, Math.PI / 4)
        cr.stroke()
      }
    }
  })
  createEffect(() => {
    muted = volumeOsd.mute()
    iconVolume = volumeOsd.volume()
    icon.queue_draw()
  })
  createEffect(() => icon.set_margin_bottom(iconOffset()))

  return (
    <window
      name={`volume-osd-${monitor.connector}`}
      namespace="ags-volume-osd"
      class="VolumeOsd"
      visible={focused}
      gdkmonitor={monitor}
      anchor={Astal.WindowAnchor.RIGHT}
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.NONE}
      marginRight={0}
      $={(window) => {
        const makeClickThrough = () => window.get_surface()?.set_input_region(new Cairo.Region())
        const realized = window.connect("realize", makeClickThrough)

        makeClickThrough()
        onCleanup(() => {
          window.disconnect(realized)
          window.destroy()
        })
      }}
    >
      <overlay
        widthRequest={320}
        heightRequest={TRACK_HEIGHT + 24}
        overflow={Gtk.Overflow.HIDDEN}
        $={(widget) => {
          let current = targetVolume()
          let from = current
          let target = current
          let started = 0
          let tickId: number | undefined

          function frame(now: number) {
            const progress = clamp((now - started) / VOLUME_DURATION_US, 0, 1)
            current = from + (target - from) * (1 - (1 - progress) ** 3)
            setAnimatedVolume(current)
            return progress < 1
          }

          createEffect(() => {
            const next = targetVolume()
            if (next === target) return
            const now = GLib.get_monotonic_time()
            if (tickId !== undefined) frame(now)
            from = current
            target = next
            started = now
            if (tickId === undefined)
              tickId = widget.add_tick_callback((_widget, clock) => {
                const running = frame(clock.get_frame_time())
                if (!running) tickId = undefined
                return running
              })
          })
          onCleanup(() => {
            if (tickId !== undefined) widget.remove_tick_callback(tickId)
          })
        }}
      >
        <box />
        <revealer
          $type="overlay"
          revealChild={volumeOsd.visible}
          transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
          transitionDuration={220}
          halign={Gtk.Align.END}
          valign={Gtk.Align.FILL}
        >
          <box
            class="content"
            halign={Gtk.Align.END}
            valign={Gtk.Align.CENTER}
            spacing={12}
            marginEnd={12}
          >
            <box
              class="sink-panel"
              visible={volumeOsd.mode.as((mode) => mode === "sink")}
              orientation={Gtk.Orientation.VERTICAL}
              valign={Gtk.Align.CENTER}
              spacing={6}
              widthRequest={190}
            >
              <label class="sink-icon" label="󰓃" />
              <label
                class="sink-name"
                label={volumeOsd.description.as((description) => description ?? "Unknown output")}
                ellipsize={Pango.EllipsizeMode.END}
                maxWidthChars={22}
                singleLineMode
              />
            </box>
            <box class="track-edge">
              <overlay class="track" widthRequest={48} heightRequest={TRACK_HEIGHT}>
                <box />
                <box
                  $type="overlay"
                  class="fill"
                  heightRequest={fillHeight}
                  halign={Gtk.Align.FILL}
                  valign={Gtk.Align.END}
                />
                <box
                  $type="overlay"
                  class="overflow"
                  heightRequest={overflowHeight}
                  halign={Gtk.Align.FILL}
                  valign={Gtk.Align.END}
                />
                <box $type="overlay" halign={Gtk.Align.FILL} valign={Gtk.Align.FILL}>
                  {icon}
                </box>
                <box
                  $type="overlay"
                  heightRequest={percentageHeight}
                  halign={Gtk.Align.FILL}
                  valign={Gtk.Align.END}
                  homogeneous
                >
                  <label
                    class="percentage"
                    label={percentage}
                    visible={showPercentage}
                    valign={Gtk.Align.START}
                  />
                </box>
              </overlay>
            </box>
          </box>
        </revealer>
      </overlay>
    </window>
  ) as Astal.Window
}
