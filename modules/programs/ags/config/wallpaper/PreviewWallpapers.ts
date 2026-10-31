import app from "ags/gtk4/app"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import Cairo from "cairo"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import type { createWallpaperImages } from "../services/wallpaper-images"

export const previewHandleHeight = 18

export function createPreviewWallpapers({
  monitor,
  paths,
  selected,
  images,
  onSelect,
  onRevealChanged,
}: {
  monitor: Gdk.Monitor
  paths: string[]
  selected: string
  images: ReturnType<typeof createWallpaperImages>
  onSelect: (path: string) => void
  onRevealChanged: (offset: number) => void
}) {
  let open = false
  let keyboardFocus = false
  let enabled = true
  let reveal = 0
  let animation = 0
  let animationTarget: boolean | undefined
  let scrollAnimation = 0
  let scrollTarget = 0
  let revision = 0
  let viewport = ""
  let clock: Gdk.FrameClock | undefined
  let painted = 0
  const blurWindow = new Astal.Window({
    name: "wallpaper-preview-background",
    namespace: "ags-wallpaper-preview-background",
    css_classes: ["WallpaperPreview"],
    gdkmonitor: monitor,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT,
    layer: Astal.Layer.OVERLAY,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.NONE,
    child: new Gtk.Box({ css_classes: ["preview-wallpaper-blur"] }),
  })
  app.add_window(blurWindow)
  let disconnectBlurLayout: (() => void) | undefined
  const clearBlurInput = () => blurWindow.get_surface()?.set_input_region(new Cairo.Region())
  blurWindow.connect_after("realize", () => {
    disconnectBlurLayout?.()
    const surface = blurWindow.get_surface()!
    const layout = surface.connect_after("layout", clearBlurInput)
    disconnectBlurLayout = () => surface.disconnect(layout)
    clearBlurInput()
  })
  blurWindow.connect_after("map", clearBlurInput)
  const window = new Astal.Window({
    name: "wallpaper-preview-strip",
    namespace: "ags-wallpaper-preview-strip",
    css_classes: ["WallpaperPreview"],
    gdkmonitor: monitor,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT,
    layer: Astal.Layer.OVERLAY,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.NONE,
  })
  app.add_window(window)
  const handleWindow = new Astal.Window({
    name: "wallpaper-preview-handle",
    namespace: "ags-wallpaper-preview-handle",
    css_classes: ["WallpaperPreview"],
    gdkmonitor: monitor,
    anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT,
    layer: Astal.Layer.OVERLAY,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.NONE,
  })
  app.add_window(handleWindow)
  const selection = new Gtk.SingleSelection({
    model: Gtk.StringList.new(paths),
    autoselect: false,
    selected: paths.includes(selected) ? paths.indexOf(selected) : Gtk.INVALID_LIST_POSITION,
  })
  const cells = new Map<
    Gtk.ListItem,
    {
      picture: Gtk.Picture
      view: Gtk.Widget
      path: string
      requested: string
      cancel?: Gio.Cancellable
    }
  >()
  const factory = new Gtk.SignalListItemFactory()
  const setup = factory.connect("setup", (_factory, item: Gtk.ListItem) => {
    const picture = new Gtk.Picture({
      content_fit: Gtk.ContentFit.COVER,
      can_shrink: true,
      css_classes: ["preview-wallpaper-thumbnail"],
    })
    // Ignore the texture's natural size so every thumbnail stays 160 × 90.
    const view = new Gtk.Overlay({ child: new Gtk.Box({ width_request: 160, height_request: 90 }) })
    view.add_overlay(picture)
    item.set_child(view)
    cells.set(item, { picture, view, path: "", requested: "" })
  })
  const bind = factory.connect("bind", (_factory, item: Gtk.ListItem) => {
    const cell = cells.get(item)!
    cell.cancel?.cancel()
    cell.path = (item.get_item() as Gtk.StringObject).string
    cell.requested = ""
    cell.picture.paintable = null
    cell.view.tooltip_text = GLib.path_get_basename(cell.path)
    revision++
  })
  const unbind = factory.connect("unbind", (_factory, item: Gtk.ListItem) => {
    const cell = cells.get(item)!
    cell.cancel?.cancel()
    cell.picture.paintable = null
    cell.path = cell.requested = ""
    revision++
  })
  const teardown = factory.connect("teardown", (_factory, item: Gtk.ListItem) => {
    cells.get(item)?.cancel?.cancel()
    cells.delete(item)
  })
  const list = new Gtk.ListView({
    model: selection,
    factory,
    orientation: Gtk.Orientation.HORIZONTAL,
    single_click_activate: true,
    css_classes: ["preview-wallpaper-list"],
  })
  list.connect("activate", (_list, position: number) => {
    onSelect(paths[position])
  })
  const scroller = new Gtk.ScrolledWindow({
    child: list,
    hscrollbar_policy: Gtk.PolicyType.EXTERNAL,
    vscrollbar_policy: Gtk.PolicyType.NEVER,
    min_content_height: 106,
    kinetic_scrolling: true,
  })
  const wheel = new Gtk.EventControllerScroll({
    flags: Gtk.EventControllerScrollFlags.BOTH_AXES,
    propagation_phase: Gtk.PropagationPhase.CAPTURE,
  })
  function stopScrollAnimation() {
    if (scrollAnimation) scroller.remove_tick_callback(scrollAnimation)
    scrollAnimation = 0
  }
  wheel.connect("scroll", (controller, dx: number, dy: number) => {
    if (Math.abs(dx) > Math.abs(dy)) {
      stopScrollAnimation()
      return false
    }
    if (!dy) return false
    const adjustment = scroller.hadjustment
    if (controller.get_unit() === Gdk.ScrollUnit.SURFACE) {
      stopScrollAnimation()
      adjustment.value += dy
      return true
    }
    scrollTarget = Math.max(
      0,
      Math.min(
        (scrollAnimation ? scrollTarget : adjustment.value) + dy * 176,
        adjustment.upper - adjustment.page_size,
      ),
    )
    stopScrollAnimation()
    if (!Gtk.Settings.get_default()?.gtk_enable_animations) {
      adjustment.value = scrollTarget
      return true
    }
    const from = adjustment.value
    let started = 0
    scrollAnimation = scroller.add_tick_callback((_widget, clock) => {
      if (!started) started = clock.get_frame_time()
      const progress = Math.min(1, (clock.get_frame_time() - started) / 180000)
      adjustment.value = from + (scrollTarget - from) * (1 - (1 - progress) ** 3)
      if (progress < 1) return true
      scrollAnimation = 0
      return false
    })
    return true
  })
  scroller.add_controller(wheel)
  let scrollOrigin = 0
  const pan = new Gtk.GestureDrag({
    button: Gdk.BUTTON_PRIMARY,
    propagation_phase: Gtk.PropagationPhase.CAPTURE,
  })
  pan.connect("drag-begin", (gesture) => {
    if (gesture.get_current_event_device()?.get_source() === Gdk.InputSource.TOUCHSCREEN) {
      gesture.set_state(Gtk.EventSequenceState.DENIED)
      return
    }
    stopScrollAnimation()
    scrollOrigin = scroller.hadjustment.value
  })
  pan.connect("drag-update", (gesture, dx: number, dy: number) => {
    if (Math.abs(dx) < 4 || Math.abs(dx) < Math.abs(dy)) return
    gesture.set_state(Gtk.EventSequenceState.CLAIMED)
    scroller.hadjustment.value = scrollOrigin - dx
  })
  scroller.add_controller(pan)
  function updateThumbnails() {
    const width = scroller.get_width()
    const next = `${revision}:${width}:${scroller.hadjustment.value}:${scroller.hadjustment.upper}`
    if (!open || !width || next === viewport) return
    viewport = next
    for (const cell of cells.values()) {
      const [valid, bounds] = cell.view.compute_bounds(scroller)
      const visible =
        valid &&
        bounds.get_width() > 0 &&
        bounds.get_x() < width + 180 &&
        bounds.get_x() + bounds.get_width() > -180
      if (!visible) {
        cell.cancel?.cancel()
        cell.picture.paintable = null
        cell.requested = ""
      } else if (cell.path && cell.requested !== cell.path) {
        const path = (cell.requested = cell.path)
        const cancel = (cell.cancel = new Gio.Cancellable())
        void images.thumbnail(path, cancel).then((texture) => {
          if (!cancel.is_cancelled() && cell.path === path) cell.picture.paintable = texture
        })
      }
    }
  }
  function disconnect() {
    stopScrollAnimation()
    clock?.disconnect(painted)
    clock = undefined
    for (const cell of cells.values()) {
      cell.cancel?.cancel()
      cell.requested = ""
    }
  }
  scroller.connect("map", () => {
    viewport = ""
    clock = scroller.get_frame_clock()!
    painted = clock.connect("after-paint", updateThumbnails)
  })
  scroller.connect("unmap", disconnect)
  const scrollbar = new Gtk.Scrollbar({
    orientation: Gtk.Orientation.HORIZONTAL,
    adjustment: scroller.hadjustment,
  })
  scrollbar.add_css_class("wallpaper-scrollbar")
  function pullHandle() {
    const handle = new Gtk.CenterBox({
      height_request: previewHandleHeight,
      hexpand: true,
      css_classes: ["preview-wallpaper-handle"],
      tooltip_text: "Drag to open or close wallpapers. Ctrl+Down opens and focuses them.",
    })
    handle.set_center_widget(
      new Gtk.Box({
        width_request: 64,
        height_request: 4,
        valign: Gtk.Align.CENTER,
        css_classes: ["pull-handle"],
      }),
    )
    let origin = 0
    let dragged = false
    const drag = new Gtk.GestureDrag({ button: Gdk.BUTTON_PRIMARY })
    drag.connect("drag-begin", () => {
      stopAnimation()
      origin = reveal
      dragged = false
    })
    drag.connect("drag-update", (gesture, _dx, dy: number) => {
      if (!dragged && Math.abs(dy) < 3) return
      dragged = true
      gesture.set_state(Gtk.EventSequenceState.CLAIMED)
      positionSheet(origin + dy)
    })
    drag.connect("drag-end", () => {
      if (dragged) setOpen(reveal >= travel() / 2)
    })
    handle.add_controller(drag)
    const click = new Gtk.GestureClick({ button: Gdk.BUTTON_PRIMARY })
    click.connect("pressed", () => {
      dragged = false
    })
    click.connect("released", () => {
      if (!dragged) setOpen(!(animationTarget ?? open))
    })
    handle.add_controller(click)
    return handle
  }
  const handle = pullHandle()
  const body = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    css_classes: ["preview-wallpaper-strip"],
  })
  body.append(scroller)
  body.append(scrollbar)
  const background = new Gtk.Box({
    css_classes: ["preview-wallpaper-background"],
    opacity: 0,
    can_target: false,
  })
  const pane = new Gtk.Overlay({ child: background })
  pane.add_overlay(body)
  pane.set_measure_overlay(body, true)
  window.set_child(pane)
  const handleBackground = new Gtk.Box({
    css_classes: ["preview-wallpaper-background", "preview-wallpaper-handle-background"],
    opacity: 0,
    can_target: false,
  })
  const handlePane = new Gtk.Overlay({ child: handleBackground })
  handlePane.add_overlay(handle)
  handlePane.set_measure_overlay(handle, true)
  handleWindow.set_child(handlePane)
  const keys = new Gtk.EventControllerKey({ propagation_phase: Gtk.PropagationPhase.CAPTURE })
  keys.connect("key-pressed", (_controller, key: number) => {
    if (key !== Gdk.KEY_Escape) return false
    setOpen(false)
    return true
  })
  window.add_controller(keys)
  window.connect("close-request", () => {
    setOpen(false)
    return true
  })
  function travel() {
    return body.measure(Gtk.Orientation.VERTICAL, monitor.get_geometry().width)[0]
  }
  function focusSelection() {
    if (selection.selected !== Gtk.INVALID_LIST_POSITION)
      list.scroll_to(selection.selected, Gtk.ListScrollFlags.FOCUS, null)
    else list.grab_focus()
  }
  function positionSheet(value: number) {
    const wasOpen = open
    const distance = travel()
    reveal = Math.max(0, Math.min(value, distance))
    open = reveal > 0
    const progress = distance ? reveal / distance : 0
    background.opacity = handleBackground.opacity = progress
    const blurHeight = distance + previewHandleHeight
    if (blurWindow.height_request !== blurHeight) blurWindow.height_request = blurHeight
    // Reveal blur beneath the handle without leaving any of it onscreen when closed.
    blurWindow.margin_top = Math.round((progress - 1) * blurHeight)
    window.margin_top = Math.round(reveal - distance)
    handleWindow.margin_top = Math.round(reveal)
    if (open !== wasOpen)
      window.keymode = open
        ? keyboardFocus
          ? Astal.Keymode.EXCLUSIVE
          : Astal.Keymode.ON_DEMAND
        : Astal.Keymode.NONE
    window.set_visible(enabled && open)
    onRevealChanged(reveal)
    if (open && !wasOpen) {
      if (keyboardFocus) focusSelection()
      else if (selection.selected !== Gtk.INVALID_LIST_POSITION)
        list.scroll_to(selection.selected, Gtk.ListScrollFlags.NONE, null)
    }
  }
  function stopAnimation() {
    if (animation) handleWindow.remove_tick_callback(animation)
    animation = 0
    animationTarget = undefined
  }
  function setOpen(next: boolean) {
    if (!enabled && next) return
    if (!next) keyboardFocus = false
    if (animation && animationTarget === next) return
    stopAnimation()
    const from = reveal
    const to = next ? travel() : 0
    if (from === to || !Gtk.Settings.get_default()?.gtk_enable_animations) {
      positionSheet(to)
      return
    }
    animationTarget = next
    let started = 0
    // The unblurred handle stays onscreen and supplies frames while the pane is offscreen.
    animation = handleWindow.add_tick_callback((_widget, clock) => {
      if (!started) started = clock.get_frame_time()
      const progress = Math.min(1, (clock.get_frame_time() - started) / 180000)
      positionSheet(from + (to - from) * (1 - (1 - progress) ** 3))
      if (progress < 1) return true
      animation = 0
      animationTarget = undefined
      return false
    })
  }
  return {
    get open() {
      return open
    },
    present() {
      positionSheet(reveal)
      blurWindow.present()
      handleWindow.present()
    },
    setOpen,
    focus() {
      if (!enabled) return
      keyboardFocus = true
      setOpen(true)
      if (open) {
        window.keymode = Astal.Keymode.EXCLUSIVE
        focusSelection()
      }
    },
    setEnabled(next: boolean) {
      enabled = next
      if (!enabled) {
        keyboardFocus = false
        stopAnimation()
        positionSheet(0)
        handleWindow.visible = false
        blurWindow.visible = false
      } else {
        blurWindow.present()
        handleWindow.present()
      }
    },
    select(path: string) {
      selection.selected = paths.includes(path) ? paths.indexOf(path) : Gtk.INVALID_LIST_POSITION
    },
    dispose() {
      stopAnimation()
      disconnect()
      for (const signal of [setup, bind, unbind, teardown]) factory.disconnect(signal)
      cells.clear()
      list.model = null
      list.factory = null
      disconnectBlurLayout?.()
      window.destroy()
      handleWindow.destroy()
      blurWindow.destroy()
    },
  }
}
