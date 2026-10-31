import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { timeout, type Timer } from "ags/time"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import type { createWallpaperImages } from "../services/wallpaper-images"
import { wallpaperColorAt, type PixelImage } from "../services/wallpaper-colors"
import { createPreviewWallpapers, previewHandleHeight } from "./PreviewWallpapers"

const allEdges =
  Astal.WindowAnchor.TOP |
  Astal.WindowAnchor.BOTTOM |
  Astal.WindowAnchor.LEFT |
  Astal.WindowAnchor.RIGHT
const controlsGap = 6
const controlsTop = previewHandleHeight + controlsGap

function label(text = "", className = "") {
  return new Gtk.Label({ label: text, xalign: 0, css_classes: className ? [className] : [] })
}
function button(text: string, action: () => void, className = "") {
  const widget = new Gtk.Button({ label: text, css_classes: className ? [className] : [] })
  widget.connect("clicked", action)
  return widget
}
function detach(widget: Gtk.Widget) {
  const parent = widget.get_parent()
  if (parent instanceof Gtk.CenterBox) parent.set_end_widget(null)
  else if (parent instanceof Gtk.Box) parent.remove(widget)
}

export function createWallpaperPreview({
  monitor,
  bar,
  texture: initialTexture,
  path,
  paths,
  images,
  colors,
  setTheme,
  onSelect,
  onClose,
  onLoadingChanged,
}: {
  monitor: Gdk.Monitor
  bar: Astal.Window
  texture: Gdk.Texture
  path: string
  paths: string[]
  images: ReturnType<typeof createWallpaperImages>
  colors: {
    section: Gtk.Box
    custom: Gtk.ToggleButton
    value: Gtk.Box
    ratings: Gtk.Label
    current: () => string
    select: (hex: string, updateEditor?: boolean) => void
    ready: () => boolean
    editorOpen: () => boolean
    closeEditor: () => void
  }
  setTheme: (color: string | null) => void
  onSelect: (path: string) => void
  onClose: () => void
  onLoadingChanged: () => void
}) {
  const {
    section: accentSection,
    custom,
    value: colorValue,
    ratings,
    current: getAccent,
    select: onColor,
    ready: canSample,
    editorOpen,
    closeEditor,
  } = colors
  const content = bar.get_child()
  if (!content) throw new Error("The bar is unavailable for preview")
  const expanded = content.hexpand
  const homes = [custom, colorValue, accentSection].map((widget) => ({
    widget,
    parent: widget.get_parent() as Gtk.Box,
    after: widget.get_prev_sibling(),
  }))
  const disposers: (() => void)[] = []
  let disposed = false
  let selected = path
  let imageRequest: Gio.Cancellable | undefined
  let accentTimer: Timer | undefined
  let stopActiveSampling: ((keep: boolean) => void) | undefined
  function updateAccent() {
    if (disposed || accentTimer) return
    accentTimer = timeout(16, () => {
      accentTimer = undefined
      if (!disposed) setTheme(getAccent())
    })
  }
  function dispose() {
    if (disposed) return
    disposed = true
    imageRequest?.cancel()
    imageRequest = undefined
    stopActiveSampling?.(false)
    accentTimer?.cancel()
    accentTimer = undefined
    setTheme(null)
    content!.hexpand = expanded
    if (bar.get_child() !== content) {
      detach(content!)
      bar.set_child(content)
    }
    for (const { widget, parent, after } of homes) {
      if (widget.get_parent() === parent) continue
      detach(widget)
      parent.insert_child_after(widget, after)
    }
    for (const dispose of disposers.reverse()) dispose()
  }
  try {
    const geometry = monitor.get_geometry()
    let texture = initialTexture
    const picture = new Gtk.Picture({
      paintable: texture,
      content_fit: Gtk.ContentFit.COVER,
      can_shrink: true,
      hexpand: true,
      vexpand: true,
    })
    const overlay = new Gtk.Overlay({ child: picture })
    const fullscreen = new Astal.Window({
      name: "wallpaper-preview",
      namespace: "ags-wallpaper-preview",
      css_classes: ["Bar", "WallpaperPreview"],
      gdkmonitor: monitor,
      layer: Astal.Layer.OVERLAY,
      anchor: allEdges,
      exclusivity: Astal.Exclusivity.IGNORE,
      keymode: Astal.Keymode.EXCLUSIVE,
      child: overlay,
    })
    fullscreen.set_default_size(geometry.width, geometry.height)
    app.add_window(fullscreen)
    disposers.push(() => fullscreen.destroy())
    const controlsWindow = new Astal.Window({
      name: "wallpaper-preview-controls",
      namespace: "ags-wallpaper-preview-controls",
      css_classes: ["WallpaperPreview"],
      gdkmonitor: monitor,
      layer: Astal.Layer.OVERLAY,
      anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT,
      margin_top: controlsTop,
      exclusivity: Astal.Exclusivity.IGNORE,
      keymode: Astal.Keymode.EXCLUSIVE,
    })
    app.add_window(controlsWindow)
    disposers.push(() => controlsWindow.destroy())
    const holder = new Gtk.Box({
      halign: Gtk.Align.FILL,
      valign: Gtk.Align.END,
      margin_start: bar.margin_left,
      margin_end: bar.margin_right,
      margin_bottom: bar.margin_bottom,
      height_request: bar.get_height() || 30,
    })
    let sampling = false
    let previousColor = getAccent()
    let pixels: PixelImage | undefined
    let controlsX = 0
    let controlsY = controlsTop
    let controlsMoved = false
    let drawerOffset = 0
    const strip = createPreviewWallpapers({
      monitor,
      paths,
      selected,
      images,
      onSelect: (path) => void switchWallpaper(path),
      onRevealChanged: (offset) => {
        const wasOpen = drawerOffset > 0
        drawerOffset = offset
        positionControls()
        if (wasOpen !== offset > 0) {
          const keymode = offset > 0 ? Astal.Keymode.ON_DEMAND : Astal.Keymode.EXCLUSIVE
          fullscreen.keymode = controlsWindow.keymode = keymode
        }
      },
    })
    disposers.push(() => strip.dispose())
    bar.set_child(null)
    content.hexpand = true
    holder.append(content)
    overlay.add_overlay(holder)
    const sampleLayer = new Gtk.Box({
      css_classes: ["wallpaper-eyedropper"],
      visible: false,
      hexpand: true,
      vexpand: true,
      can_target: true,
    })
    sampleLayer.set_cursor_from_name("crosshair")
    overlay.add_overlay(sampleLayer)
    const controls = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 12,
      css_classes: ["preview-controls"],
      width_request: 500,
    })
    const header = new Gtk.Box({ spacing: 16, css_classes: ["preview-header"] })
    header.append(dragHandle())
    const back = button("Back to picker", onClose)
    back.tooltip_text = "Esc returns to picker. Ctrl+Down opens wallpapers."
    header.append(back)
    const description = label(`${GLib.path_get_basename(selected)} · ${monitor.connector}`, "muted")
    description.ellipsize = Pango.EllipsizeMode.MIDDLE
    description.max_width_chars = 40
    description.hexpand = true
    description.xalign = 1
    header.append(description)
    controls.append(header)
    detach(accentSection)
    controls.append(accentSection)
    const colorTools = new Gtk.Box({ spacing: 8, css_classes: ["preview-color-tools"] })
    detach(custom)
    colorTools.append(custom)
    const sampleButton = button("Pick from wallpaper", startSampling, "preview-eyedropper")
    colorTools.append(sampleButton)
    detach(colorValue)
    const colorActions = new Gtk.CenterBox({ css_classes: ["preview-color-actions"] })
    colorActions.set_start_widget(colorTools)
    colorActions.set_end_widget(colorValue)
    controls.append(colorActions)
    const compact = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 8,
      css_classes: ["preview-controls", "sampling-controls"],
    })
    const compactRow = new Gtk.Box({ spacing: 8 })
    const grip = dragHandle()
    compactRow.append(grip)
    compactRow.append(button("Cancel", () => stopSampling(false)))
    compact.append(compactRow)
    compact.append(label("Click or Enter to keep · Esc cancels", "muted"))
    const panels = new Gtk.Stack({ hhomogeneous: false, vhomogeneous: false })
    panels.add_named(controls, "controls")
    panels.add_named(compact, "sampling")
    controlsWindow.set_child(panels)
    function dragHandle() {
      const grip = label("⠿", "preview-grip")
      grip.tooltip_text = "Drag to move"
      grip.set_cursor_from_name("grab")
      let dragX = 0
      let dragY = 0
      const drag = new Gtk.GestureDrag({ button: Gdk.BUTTON_PRIMARY })
      drag.connect("drag-begin", (gesture) => {
        dragX = controlsX
        dragY = controlsWindow.margin_top
        controlsMoved = true
        grip.set_cursor_from_name("grabbing")
        gesture.set_state(Gtk.EventSequenceState.CLAIMED)
      })
      drag.connect("drag-update", (_gesture, dx: number, dy: number) => {
        moveControls(dragX + dx, dragY + dy)
      })
      drag.connect("drag-end", () => grip.set_cursor_from_name("grab"))
      grip.add_controller(drag)
      return grip
    }
    function moveControls(
      x: number,
      y: number,
      width = controlsWindow.get_width(),
      height = controlsWindow.get_height(),
    ) {
      controlsX = Math.max(8, Math.min(x, geometry.width - width - 8))
      controlsY = Math.max(8, Math.min(y, geometry.height - height - 8))
      positionControls(height)
    }
    function positionControls(height = controlsWindow.get_height()) {
      const minimumY = sampling ? 8 : controlsTop + drawerOffset
      controlsWindow.margin_left = Math.round(controlsX)
      controlsWindow.margin_top = Math.round(
        Math.min(Math.max(controlsY, minimumY), geometry.height - height - 8),
      )
    }
    function resizeControls() {
      const panel = sampling ? compact : controls
      panels.visible_child = panel
      const [width] = panel.measure(Gtk.Orientation.HORIZONTAL, -1)
      const [height] = panel.measure(Gtk.Orientation.VERTICAL, width)
      controlsWindow.set_size_request(width, height)
      controlsWindow.set_default_size(width, height)
      moveControls(
        controlsMoved ? controlsX : (geometry.width - width) / 2,
        controlsY,
        width,
        height,
      )
    }
    async function switchWallpaper(path: string) {
      imageRequest?.cancel()
      imageRequest = undefined
      if (path === selected) {
        strip.select(path)
        description.label = `${GLib.path_get_basename(path)} · ${monitor.connector}`
        notifyLoading()
        return
      }
      closeEditor()
      stopSampling(true)
      const request = (imageRequest = new Gio.Cancellable())
      description.label = `Loading ${GLib.path_get_basename(path)}…`
      notifyLoading()
      try {
        const next = await images.preview(
          path,
          Math.max(geometry.width, geometry.height) * monitor.get_scale_factor(),
          request,
        )
        if (request.is_cancelled() || disposed) return
        texture = next
        picture.paintable = texture
        pixels = undefined
        selected = path
        strip.select(path)
        description.label = `${GLib.path_get_basename(path)} · ${monitor.connector}`
        onSelect(path)
      } catch (cause) {
        if (!request.is_cancelled()) {
          console.error("Previewing wallpaper:", cause)
          description.label = "Could not load this wallpaper."
        }
      } finally {
        if (imageRequest === request) imageRequest = undefined
        notifyLoading()
      }
    }
    function startSampling() {
      if (sampling) {
        stopSampling(false)
        return
      }
      try {
        if (!pixels) {
          const downloader = new Gdk.TextureDownloader(texture)
          downloader.set_format(Gdk.MemoryFormat.R8G8B8A8)
          const [bytes, rowstride] = downloader.download_bytes()
          pixels = {
            width: texture.get_width(),
            height: texture.get_height(),
            channels: 4,
            rowstride,
            pixels: bytes.toArray(),
          }
        }
        previousColor = getAccent()
        sampling = true
        strip.setEnabled(false)
        colorActions.set_end_widget(null)
        compactRow.insert_child_after(colorValue, grip)
        accentSection.remove(ratings)
        compact.insert_child_after(ratings, compactRow)
        sampleLayer.visible = true
        resizeControls()
      } catch (cause) {
        console.error("Wallpaper color picker:", cause)
        description.label = "Could not read wallpaper colors. Try Custom instead."
      }
    }
    function stopSampling(keep: boolean) {
      if (!sampling) return
      sampling = false
      sampleLayer.visible = false
      compactRow.remove(colorValue)
      colorActions.set_end_widget(colorValue)
      compact.remove(ratings)
      accentSection.append(ratings)
      if (!disposed) {
        strip.setEnabled(true)
        resizeControls()
      }
      onColor(keep ? getAccent() : previousColor)
    }
    function sampleAt(x: number, y: number) {
      if (!sampling || !pixels) return
      const size = { width: sampleLayer.get_width(), height: sampleLayer.get_height() }
      if (!size.width || !size.height) return
      const value = wallpaperColorAt(pixels, size, x, y)
      if (value !== getAccent()) onColor(value, false)
    }
    const motion = new Gtk.EventControllerMotion()
    motion.connect("enter", (_controller, x, y) => sampleAt(x, y))
    motion.connect("motion", (_controller, x, y) => sampleAt(x, y))
    sampleLayer.add_controller(motion)
    const click = new Gtk.GestureClick({ button: Gdk.BUTTON_PRIMARY })
    click.connect("pressed", (gesture, _count, x, y) => {
      if (!sampling) return
      gesture.set_state(Gtk.EventSequenceState.CLAIMED)
      sampleAt(x, y)
      stopSampling(true)
    })
    sampleLayer.add_controller(click)
    for (const surface of [fullscreen, controlsWindow]) {
      const keys = new Gtk.EventControllerKey({ propagation_phase: Gtk.PropagationPhase.CAPTURE })
      keys.connect(
        "key-pressed",
        (_controller, key: number, _code: number, state: Gdk.ModifierType) => {
          if (
            !sampling &&
            !editorOpen() &&
            key === Gdk.KEY_Down &&
            state & Gdk.ModifierType.CONTROL_MASK
          ) {
            strip.focus()
            return true
          }
          if (sampling && (key === Gdk.KEY_Return || key === Gdk.KEY_KP_Enter)) {
            stopSampling(true)
            return true
          }
          if (key === Gdk.KEY_Escape) {
            if (editorOpen()) closeEditor()
            else if (sampling) stopSampling(false)
            else if (strip.open) strip.setOpen(false)
            else onClose()
            return true
          }
          return false
        },
      )
      surface.add_controller(keys)
      surface.connect("close-request", () => {
        onClose()
        return true
      })
    }

    stopActiveSampling = stopSampling
    function update() {
      if (!disposed) sampleButton.sensitive = canSample() && !imageRequest
    }
    function notifyLoading() {
      if (disposed) return
      update()
      onLoadingChanged()
    }
    return {
      get loading() {
        return Boolean(imageRequest)
      },
      present() {
        if (disposed) return
        setTheme(getAccent())
        resizeControls()
        update()
        fullscreen.present()
        controlsWindow.present()
        strip.present()
      },
      update,
      updateAccent,
      stopSampling,
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}
