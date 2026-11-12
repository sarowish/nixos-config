import app from "ags/gtk4/app"
import { createEffect, createState, onCleanup } from "ags"
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { timeout, type Timer } from "ags/time"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import { createWallpapers } from "../services/wallpapers"
import { createAccentPreview } from "../services/accent-preview"
import { createWallpaperImages, type WallpaperAnalysis } from "../services/wallpaper-images"
import PopupWindow from "../widgets/PopupWindow"
import { createWallpaperPreview } from "./WallpaperPreview"
import {
  contrastLabel,
  contrast,
  luminance,
  rgb,
  scoreAccent,
  type AccentSuggestion,
  type WallpaperOutput,
} from "../services/wallpaper-colors"

const allEdges =
  Astal.WindowAnchor.TOP |
  Astal.WindowAnchor.BOTTOM |
  Astal.WindowAnchor.LEFT |
  Astal.WindowAnchor.RIGHT

const contrastColors = {
  Good: "#a6e3a1",
  Fair: "#fae3b0",
  "Weak in places": "#f38ba8",
  Unavailable: "#9399b2",
}

const previewLoading = "Loading fullscreen preview…"

function label(text = "", className = "") {
  return new Gtk.Label({ label: text, xalign: 0, css_classes: className ? [className] : [] })
}

function button(text: string, action: () => void, className = "") {
  const widget = new Gtk.Button({ label: text, css_classes: className ? [className] : [] })
  widget.connect("clicked", action)
  return widget
}

function hideScreenPicker(widget: Gtk.Widget) {
  // GTK's embedded editor has no option to hide its screen eyedropper.
  if (widget instanceof Gtk.Button && widget.icon_name === "color-select-symbolic") {
    widget.visible = false
    return
  }
  for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
    hideScreenPicker(child)
}

export function createWallpaperPicker(css: string, focusedOutput: () => string | undefined) {
  const wallpapers = createWallpapers()
  const theme = createAccentPreview(css)
  const images = createWallpaperImages()
  const saved = wallpapers.browsing
  let selected = saved.selected
  let accent = theme.colors().accent
  let target = "DP-1"
  let loaded = false
  let changingSelection = false
  let scroll = saved.scroll
  let restoringScroll = false
  let openRequest = 0
  const pendingTicks = new Set<number>()
  let saveTimer: Timer | undefined
  let analysis: Gio.Cancellable | undefined
  let image: (WallpaperAnalysis & { path: string }) | undefined
  let analyzing = false
  let thumbnailRevision = 0
  let renderedPaths: string[] = []
  let openingPreview: Gio.Cancellable | undefined
  let preview: ReturnType<typeof createWallpaperPreview> | undefined
  let suggestions: AccentSuggestion[] = []
  let configured: AccentSuggestion | undefined
  let copyTimer: Timer | undefined
  let syncingColor = false
  let selectedColor: AccentSuggestion | undefined
  let hoveredColor: AccentSuggestion | undefined
  let focusedColor: AccentSuggestion | undefined
  const swatches: { color: AccentSuggestion; widget: Gtk.Button }[] = []

  const window = new Astal.Window({
    name: "wallpaper",
    namespace: "ags-wallpaper-picker",
    css_classes: ["WallpaperPicker"],
    layer: Astal.Layer.OVERLAY,
    anchor: Astal.WindowAnchor.NONE,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.EXCLUSIVE,
  })
  app.add_window(window)
  const backdrop = new Astal.Window({
    name: "wallpaper-backdrop",
    namespace: "ags-popup-backdrop",
    css_classes: ["PopupBackdrop"],
    layer: Astal.Layer.OVERLAY,
    anchor: allEdges,
    exclusivity: Astal.Exclusivity.IGNORE,
    keymode: Astal.Keymode.NONE,
  })
  app.add_window(backdrop)
  const card = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 13,
    css_classes: ["wallpaper-card"],
    width_request: 740,
    halign: Gtk.Align.CENTER,
    valign: Gtk.Align.CENTER,
    vexpand: false,
  })
  window.set_child(card)
  const heading = new Gtk.Box({ spacing: 8 })
  heading.append(new Gtk.Image({ icon_name: "folder-pictures-symbolic", pixel_size: 16 }))
  const folderLabel = label("Pictures / Wallpapers", "heading")
  folderLabel.hexpand = true
  folderLabel.tooltip_text = wallpapers.directory
  heading.append(folderLabel)
  const close = new Gtk.Button({ icon_name: "window-close-symbolic", tooltip_text: "Close" })
  close.connect("clicked", () => hide())
  heading.append(close)
  card.append(heading)
  const search = new Gtk.SearchEntry({
    placeholder_text: "Search filenames…",
    tooltip_text: "Ctrl+F to search · Down returns to wallpapers",
    text: saved.search,
    css_classes: ["wallpaper-search"],
  })
  card.append(search)

  const selection = new Gtk.SingleSelection({ autoselect: false, can_unselect: true })
  const factory = new Gtk.SignalListItemFactory()
  type Cell = {
    picture: Gtk.Picture
    name: Gtk.Label
    badge: Gtk.Label
    view: Gtk.Widget
    path: string
    requested: string
    cancel?: Gio.Cancellable
  }
  const cells = new Map<Gtk.ListItem, Cell>()
  factory.connect("setup", (_factory, item: Gtk.ListItem) => {
    const picture = new Gtk.Picture({
      width_request: 204,
      height_request: 115,
      content_fit: Gtk.ContentFit.COVER,
      can_shrink: true,
      css_classes: ["thumbnail"],
    })
    const overlay = new Gtk.Overlay({ child: picture })
    const badge = label("", "applied-badge")
    badge.halign = Gtk.Align.START
    badge.valign = Gtk.Align.END
    badge.margin_start = badge.margin_bottom = 6
    overlay.add_overlay(badge)
    const name = label()
    name.ellipsize = Pango.EllipsizeMode.END
    name.max_width_chars = 24
    name.add_css_class("thumbnail-name")
    const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 7 })
    box.append(overlay)
    box.append(name)
    item.set_child(box)
    cells.set(item, { picture, name, badge, view: box, path: "", requested: "" })
  })
  function updateBadge(cell: Cell) {
    const names = Object.entries(wallpapers.current.peek())
      .filter(([, path]) => path === cell.path)
      .map(([name]) => name)
    cell.badge.label = names.join(", ")
    cell.badge.visible = names.length > 0
  }
  factory.connect("bind", (_factory, item: Gtk.ListItem) => {
    const cell = cells.get(item)!
    cell.cancel?.cancel()
    const path = (item.get_item() as Gtk.StringObject).string
    cell.path = path
    cell.requested = ""
    thumbnailRevision++
    cell.name.label = GLib.path_get_basename(path)
    cell.picture.paintable = null
    item.get_child()!.tooltip_text = path
    updateBadge(cell)
  })
  factory.connect("unbind", (_factory, item: Gtk.ListItem) => {
    const cell = cells.get(item)!
    cell.cancel?.cancel()
    cell.picture.paintable = null
    cell.path = ""
    cell.requested = ""
    thumbnailRevision++
  })
  factory.connect("teardown", (_factory, item: Gtk.ListItem) => {
    cells.get(item)?.cancel?.cancel()
    cells.delete(item)
  })
  const grid = new Gtk.GridView({
    model: selection,
    factory,
    min_columns: 1,
    max_columns: 3,
    single_click_activate: false,
    css_classes: ["wallpaper-grid"],
  })
  grid.connect("activate", (_grid, position: number) => {
    const path = renderedPaths[position]
    if (!path) return
    changingSelection = true
    selection.selected = position
    changingSelection = false
    select(path)
    void startPreview()
  })
  const scroller = new Gtk.ScrolledWindow({
    child: grid,
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    overlay_scrolling: false,
    height_request: 120,
    vexpand: true,
  })
  scroller.get_vscrollbar().add_css_class("wallpaper-scrollbar")
  card.append(scroller)
  let lastViewport = ""
  function updateThumbnails() {
    if (!window.visible) return
    const height = scroller.get_height()
    const viewport = `${thumbnailRevision}:${scroller.vadjustment.value}:${scroller.vadjustment.upper}:${height}:${scroller.get_width()}`
    if (!height || viewport === lastViewport) return
    lastViewport = viewport
    for (const cell of cells.values()) {
      const [valid, bounds] = cell.view.compute_bounds(scroller)
      // Gtk.GridView binds prefetched items too. Decode only the viewport and
      // one adjacent row, and cancel work as soon as it scrolls out of range.
      const visible =
        valid &&
        bounds.get_height() > 0 &&
        bounds.get_y() < height + 160 &&
        bounds.get_y() + bounds.get_height() > -160
      if (!visible) {
        cell.cancel?.cancel()
        cell.requested = ""
        cell.picture.paintable = null
      } else if (cell.path && cell.requested !== cell.path) {
        const path = (cell.requested = cell.path)
        const cancel = (cell.cancel = new Gio.Cancellable())
        void images.thumbnail(path, cancel).then((texture) => {
          if (!cancel.is_cancelled() && cell.path === path) cell.picture.paintable = texture
        })
      }
    }
  }
  let thumbnailClock: Gdk.FrameClock | undefined
  let thumbnailPaint = 0
  function disconnectThumbnails() {
    if (thumbnailClock) thumbnailClock.disconnect(thumbnailPaint)
    thumbnailClock = undefined
  }
  scroller.connect("map", () => {
    lastViewport = ""
    thumbnailClock = scroller.get_frame_clock()!
    // Tick callbacks run before layout. Inspect visibility only after GTK has
    // allocated and painted the items, including when reopening a warm model.
    thumbnailPaint = thumbnailClock.connect("after-paint", updateThumbnails)
  })
  scroller.connect("unmap", () => {
    disconnectThumbnails()
    for (const cell of cells.values()) {
      cell.cancel?.cancel()
      cell.requested = ""
    }
  })

  const details = new Gtk.Box({ spacing: 12, css_classes: ["selection-details"] })
  const fileDetails = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 3 })
  const filename = label()
  filename.ellipsize = Pango.EllipsizeMode.MIDDLE
  filename.max_width_chars = 55
  const dimensions = label("", "muted")
  fileDetails.append(filename)
  fileDetails.append(dimensions)
  details.append(fileDetails)
  const previewButton = button("Preview", () => void startPreview(), "preview-button")
  previewButton.tooltip_text =
    "Space or double-click previews a wallpaper. Ctrl+Down opens wallpapers in preview."
  details.append(previewButton)
  card.append(details)

  const accentSection = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 10,
    css_classes: ["accent-section"],
  })
  const accentHeading = new Gtk.Box({ spacing: 12 })
  const accentTitle = label("Accent suggestions")
  accentTitle.hexpand = true
  accentHeading.append(accentTitle)
  const priority = label("Main monitor first", "muted")
  priority.tooltip_text =
    "DP-1 has 90% of the weight; other monitors share 10%. Scores assume this wallpaper on each monitor."
  accentHeading.append(priority)
  accentSection.append(accentHeading)
  const paletteRow = new Gtk.Box({ spacing: 12 })
  const palette = new Gtk.FlowBox({
    css_classes: ["accent-palette"],
    column_spacing: 9,
    row_spacing: 9,
    min_children_per_line: 1,
    max_children_per_line: 9,
    selection_mode: Gtk.SelectionMode.NONE,
    hexpand: true,
    halign: Gtk.Align.START,
    valign: Gtk.Align.CENTER,
  })
  paletteRow.append(palette)
  // GTK's replacement dialog only returns a committed color; this editor supports live preview.
  const colorEditor = new Gtk.ColorChooserWidget({ show_editor: true, use_alpha: false })
  hideScreenPicker(colorEditor)
  // GTK only rebuilds the color plane's gradient while it is mapped.
  colorEditor.connect("map", syncColorEditor)
  const [colorOpen, setColorOpen] = createState(false)
  const custom = new Gtk.ToggleButton({
    sensitive: false,
    css_classes: ["custom-accent"],
    tooltip_text: "Choose an accent color",
  })
  const customLabel = new Gtk.Box({ spacing: 6 })
  customLabel.append(label("Custom"))
  customLabel.append(new Gtk.Image({ icon_name: "pan-down-symbolic", pixel_size: 16 }))
  custom.set_child(customLabel)
  custom.connect("toggled", () => {
    if (custom.active) preview?.stopSampling(true)
    setColorOpen(custom.active)
  })
  createEffect(() => {
    custom.active = colorOpen()
  })
  paletteRow.append(custom)
  const colorCard = new Gtk.Box({ css_classes: ["color-picker-card"] })
  colorCard.append(colorEditor)
  PopupWindow({
    name: "wallpaper-color-picker",
    className: "WallpaperColorPicker",
    child: colorCard,
    open: colorOpen,
    onClose: () => setColorOpen(false),
    place(width, height) {
      const parent = custom.get_root() as Astal.Window | null
      const monitor = parent?.gdkmonitor
      if (!parent || !monitor) return
      const [valid, bounds] = custom.compute_bounds(parent)
      if (!valid) return
      const geometry = monitor.get_geometry()
      const parentX =
        parent.anchor & Astal.WindowAnchor.LEFT
          ? parent.margin_left
          : (geometry.width - parent.get_width()) / 2
      const parentY =
        parent.anchor & Astal.WindowAnchor.TOP
          ? parent.margin_top
          : (geometry.height - parent.get_height()) / 2
      const buttonY = parentY + bounds.get_y()
      const below = buttonY + bounds.get_height() + 8
      return {
        monitor,
        x: Math.max(
          8,
          Math.min(
            parentX + bounds.get_x() + bounds.get_width() - width,
            geometry.width - width - 8,
          ),
        ),
        y: Math.max(8, below + height <= geometry.height - 8 ? below : buttonY - height - 8),
      }
    },
  })
  const colorChanged = colorEditor.connect("notify::rgba", () => {
    if (syncingColor || !configured || image?.path !== selected) return
    const { red, green, blue } = colorEditor.get_rgba()
    const value = `#${[red, green, blue]
      .map((channel) =>
        Math.round(channel * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`
    if (value !== accent) showAccent(scoreAccent(value, image.histograms, primary()), false)
  })
  const hex = label()
  hex.selectable = true
  hex.visible = false
  hex.add_css_class("hex")
  hex.add_css_class("accent-hex")
  const colorStyle = new Gtk.CssProvider()
  let paletteCss = ""
  const display = Gdk.Display.get_default()!
  Gtk.StyleContext.add_provider_for_display(
    display,
    colorStyle,
    Gtk.STYLE_PROVIDER_PRIORITY_USER + 2,
  )
  const colorValue = new Gtk.Box({
    spacing: 0,
    valign: Gtk.Align.CENTER,
    css_classes: ["accent-value"],
  })
  colorValue.append(hex)
  paletteRow.append(colorValue)
  const copy = button("Copy", () => {
    copyTimer?.cancel()
    try {
      Gdk.Display.get_default()!.get_clipboard().set(accent)
      copy.label = "Copied"
      setStatus(`${accent} copied. Set it in colors.nix to keep it.`)
    } catch {
      copy.label = "Failed"
      setStatus("Could not copy. Select the hex value to copy it manually.")
    }
    copyTimer = timeout(1500, () => {
      copyTimer = undefined
      copy.label = "Copy"
    })
  })
  const copyLabel = copy.get_child()
  if (copyLabel instanceof Gtk.Label) copyLabel.width_chars = 6
  colorValue.append(copy)
  const bookmark = new Gtk.ToggleButton({
    icon_name: "bookmark-new-symbolic",
    css_classes: ["bookmark-color"],
    sensitive: false,
  })
  bookmark.connect("clicked", () => {
    const color = accent.toLowerCase()
    if (savedColors().includes(color)) wallpapers.removeColor(selected, color)
    else wallpapers.addColor(selected, color)
  })
  colorValue.append(bookmark)
  accentSection.append(paletteRow)
  const shortlistRow = new Gtk.Box({ spacing: 9, css_classes: ["accent-shortlist"] })
  shortlistRow.append(label("Saved colors", "muted"))
  const shortlist = new Gtk.Box({ spacing: 9 })
  shortlistRow.append(
    new Gtk.ScrolledWindow({
      child: shortlist,
      hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
      vscrollbar_policy: Gtk.PolicyType.NEVER,
      min_content_height: 43,
      hexpand: true,
    }),
  )
  accentSection.append(shortlistRow)
  const savedColorsHint = label("Bookmark this wallpaper's accent candidates for later.", "muted")
  savedColorsHint.wrap = true
  accentSection.append(savedColorsHint)
  const ratings = label("Select a wallpaper to check bar contrast.", "muted")
  ratings.wrap = true
  const ratingsParentChanged = ratings.connect("notify::parent", showRatings)
  accentSection.append(ratings)
  card.append(accentSection)

  const bottom = new Gtk.Box({ spacing: 9 })
  const hint = label(
    "Arrows browse · Type to search · Space previews · Enter applies to all",
    "muted",
  )
  hint.hexpand = true
  bottom.append(hint)
  const split = new Gtk.Box({ css_classes: ["monitor-apply"] })
  const applyOne = button("Apply to DP-1", () => void apply(target))
  split.append(applyOne)
  const monitorChoices = new Gio.Menu()
  const monitorAction = Gio.SimpleAction.new_stateful(
    "monitor",
    new GLib.VariantType("s"),
    new GLib.Variant("s", target),
  )
  const monitorActions = new Gio.SimpleActionGroup()
  monitorActions.add_action(monitorAction)
  window.insert_action_group("wallpaper", monitorActions)
  const monitorMenu = new Gtk.PopoverMenu({
    menu_model: monitorChoices,
    has_arrow: false,
    position: Gtk.PositionType.TOP,
  })
  monitorAction.connect("activate", (_action, value) => {
    if (!value) return
    target = value.get_string()[0]
    monitorAction.set_state(value)
    monitorMenu.popdown()
    updateButtons()
  })
  split.append(
    new Gtk.MenuButton({
      icon_name: "pan-down-symbolic",
      popover: monitorMenu,
      tooltip_text: "Choose a monitor",
    }),
  )
  bottom.append(split)
  const applyAll = button("Apply to all", () => void apply(), "apply-all")
  bottom.append(applyAll)
  card.append(bottom)
  const status = label("", "status")
  const [statusMessage, setStatus] = createState("")
  status.wrap = true
  card.append(status)

  function monitors() {
    return app.get_monitors()
  }
  function outputs(): WallpaperOutput[] {
    return monitors()
      .map((monitor) => {
        const geometry = monitor.get_geometry()
        const bar = app.get_window(`bar-${monitor.connector}`)
        return {
          name: monitor.connector ?? "",
          width: geometry.width,
          height: geometry.height,
          barHeight: bar?.get_height() || 30,
          margin: 8,
        }
      })
      .filter((output) => output.name !== "")
  }
  function primary() {
    return outputs().some((output) => output.name === "DP-1") ? "DP-1" : (outputs()[0]?.name ?? "")
  }
  function remember() {
    saveTimer?.cancel()
    saveTimer = timeout(250, () => {
      wallpapers.save({ selected, search: search.text, scroll })
      saveTimer = undefined
    })
  }
  function updateButtons() {
    const current = wallpapers.current.peek()
    const available = Boolean(selected) && !wallpapers.busy.peek()
    const names = outputs().map((output) => output.name)
    applyOne.label = `Apply to ${target}`
    applyOne.sensitive = available && names.includes(target) && current[target] !== selected
    applyAll.sensitive =
      available && names.length > 0 && !names.every((name) => current[name] === selected)
    previewButton.sensitive =
      Boolean(image?.path === selected) && !openingPreview && !preview?.loading && !analyzing
    copy.sensitive = Boolean(configured)
    custom.sensitive = Boolean(configured) && !analyzing
    updateBookmark()
    preview?.update()
  }
  function savedColors() {
    return wallpapers.colors.peek()[selected] ?? []
  }
  function updateBookmark() {
    const saved = savedColors().includes(accent.toLowerCase())
    bookmark.sensitive = Boolean(configured) && !analyzing
    bookmark.active = saved
    bookmark.icon_name = saved ? "user-bookmarks-symbolic" : "bookmark-new-symbolic"
    bookmark.tooltip_text = saved
      ? "Remove this color from this wallpaper's saved colors"
      : "Save this color as an accent candidate for this wallpaper"
  }
  function resetCopyFeedback() {
    copyTimer?.cancel()
    copyTimer = undefined
    copy.label = "Copy"
  }
  function showRatings() {
    const color = hoveredColor ?? focusedColor ?? selectedColor
    if (!color) return
    const name = primary()
    const entries = Object.entries(color.outputs).sort(
      ([first], [second]) => Number(second === name) - Number(first === name),
    )
    ratings.set_markup(
      entries
        .map(([output, sample]) => {
          const rating = contrastLabel(sample)
          return `${GLib.markup_escape_text(output, -1)}: <span foreground="${contrastColors[rating]}">${rating} · ${sample.weak.toFixed(2)}:1 · ${Math.round(sample.coverage * 100)}% at 4.5:1</span>`
        })
        .join(ratings.get_parent() === accentSection ? " · " : "\n"),
    )
    ratings.tooltip_text = entries
      .map(
        ([output, sample]) =>
          `${output}: low-end sampled contrast ${sample.weak.toFixed(2)}:1; ${Math.round(sample.coverage * 100)}% of sampled pixels reach 4.5:1.`,
      )
      .join("\n")
  }
  function syncColorEditor() {
    syncingColor = true
    try {
      // set_rgba can skip the editor when GTK's cached swatch already matches.
      colorEditor.activate_action(
        "color.customize",
        new GLib.Variant("(dddd)", [...rgb(accent), 1]),
      )
    } finally {
      syncingColor = false
    }
  }
  function updateColorStyle() {
    const brightness = luminance(rgb(accent))
    const textColor = contrast(brightness, 0) >= contrast(brightness, 1) ? "#000000" : "#ffffff"
    // A distinct selector makes GTK refresh the label immediately when its color changes.
    hex.name = `wallpaper-accent-${accent.slice(1)}`
    colorStyle.load_from_string(`
      ${paletteCss}
      #${hex.name} {
        background-color: ${accent}; color: ${textColor};
      }
    `)
  }
  function showAccent(color: AccentSuggestion, updateEditor = true) {
    if (accent !== color.hex) resetCopyFeedback()
    accent = color.hex
    hex.label = accent
    updateColorStyle()
    hex.visible = true
    if (updateEditor && colorEditor.get_mapped()) syncColorEditor()
    if ([configured, ...suggestions].some((item) => item?.hex === accent))
      custom.remove_css_class("chosen")
    else custom.add_css_class("chosen")
    for (const swatch of swatches) {
      swatch.widget.label = swatch.color.hex === accent ? "✓" : ""
      if (swatch.color.hex === accent) swatch.widget.add_css_class("chosen")
      else swatch.widget.remove_css_class("chosen")
    }
    selectedColor = color
    showRatings()
    updateBookmark()
    preview?.updateAccent()
  }
  function colorOption(color: AccentSuggestion, description: string) {
    const swatch = button("", () => showAccent(color), "swatch")
    swatch.tooltip_text = `${description}: ${color.hex}${color.source && color.source.hex !== color.hex ? ` · Based on ${color.source.hex}` : ""}`
    const motion = new Gtk.EventControllerMotion()
    motion.connect("enter", () => {
      hoveredColor = color
      showRatings()
    })
    motion.connect("leave", () => {
      hoveredColor = undefined
      showRatings()
    })
    swatch.add_controller(motion)
    const focus = new Gtk.EventControllerFocus()
    focus.connect("enter", () => {
      focusedColor = color
      showRatings()
    })
    focus.connect("leave", () => {
      focusedColor = undefined
      showRatings()
    })
    swatch.add_controller(focus)
    const colorClass = `wallpaper-color-${color.hex.slice(1)}`
    swatch.add_css_class(colorClass)
    const underline = new Gtk.Box({ css_classes: ["contrast-underline", colorClass] })
    const option = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 8,
      css_classes: ["swatch-option"],
    })
    option.append(swatch)
    option.append(underline)
    swatches.push({ color, widget: swatch })
    return option
  }
  function renderPalette() {
    hoveredColor = focusedColor = undefined
    while (palette.get_first_child()) palette.remove(palette.get_first_child()!)
    while (shortlist.get_first_child()) shortlist.remove(shortlist.get_first_child()!)
    const colors = savedColors()
    shortlistRow.visible = colors.length > 0
    savedColorsHint.visible = colors.length === 0
    swatches.length = 0
    for (const [index, color] of [configured, ...suggestions].entries()) {
      if (!color) continue
      const description = color.source
        ? {
            wallpaper: "From wallpaper",
            adjusted: "Adjusted wallpaper color",
            companion: "Companion color",
          }[color.source.kind]
        : "Configured accent"
      const option = colorOption(color, description)
      if (index === 0) option.add_css_class("configured")
      palette.append(option)
      option.get_parent()!.focusable = false
    }
    const wallpaper = selected
    for (const value of colors) {
      const color = scoreAccent(value, image?.path === selected ? image.histograms : [], primary())
      const option = colorOption(color, "Saved color")
      const swatch = option.get_first_child()!
      swatch.sensitive = Boolean(configured) && image?.path === selected
      swatch.tooltip_text += " · Right-click or Delete to remove"
      const context = new Gtk.GestureClick({
        button: Gdk.BUTTON_SECONDARY,
        propagation_phase: Gtk.PropagationPhase.CAPTURE,
      })
      context.connect("pressed", (gesture) => {
        gesture.set_state(Gtk.EventSequenceState.CLAIMED)
        wallpapers.removeColor(wallpaper, value)
      })
      option.add_controller(context)
      const keys = new Gtk.EventControllerKey()
      keys.connect("key-pressed", (_controller, key: number) => {
        if (key !== Gdk.KEY_Delete && key !== Gdk.KEY_KP_Delete) return false
        wallpapers.removeColor(wallpaper, value)
        return true
      })
      option.add_controller(keys)
      shortlist.append(option)
    }
    const main = primary()
    paletteCss = swatches
      .map(({ color }) => {
        const colorClass = `wallpaper-color-${color.hex.slice(1)}`
        return `
            button.${colorClass} { background-color: ${color.hex}; }
            box.contrast-underline.${colorClass} {
              background-color: ${contrastColors[contrastLabel(color.outputs[main])]};
            }
          `
      })
      .join("\n")
    updateColorStyle()
    const chosen = [configured, ...suggestions].find((color) => color?.hex === accent)
    if (chosen) showAccent(chosen)
    else if (configured && image?.path === selected)
      showAccent(scoreAccent(accent, image.histograms, primary()))
    updateBookmark()
  }
  async function analyze() {
    resetCopyFeedback()
    setColorOpen(false)
    analysis?.cancel()
    const cancel = (analysis = new Gio.Cancellable())
    analyzing = true
    const path = selected
    const previousAccent = image?.path === path ? accent : undefined
    suggestions = []
    configured = undefined
    selectedColor = undefined
    hex.label = ""
    hex.visible = false
    copy.sensitive = false
    custom.sensitive = false
    ratings.tooltip_text = null
    renderPalette()
    ratings.label = path
      ? "Checking contrast behind the bar…"
      : wallpapers.error.peek() ||
        (search.text.trim()
          ? `No matches for "${search.text.trim()}".`
          : `No wallpapers in ${wallpapers.directory}.`)
    filename.label = path ? GLib.path_get_basename(path) : "No wallpaper selected"
    filename.tooltip_text = path
    dimensions.label = ""
    previewButton.sensitive = false
    if (!path) {
      analyzing = false
      return
    }
    try {
      const colors = theme.colors()
      const result = await images.analyze(path, outputs(), primary(), colors, cancel)
      if (cancel.is_cancelled() || selected !== path) return
      image = { path, ...result }
      suggestions = result.suggestions
      configured = result.configured
      accent = previousAccent ?? suggestions[0]?.hex ?? colors.accent
      dimensions.label = `${result.width} × ${result.height}`
      renderPalette()
      const main = primary()
      setStatus(
        suggestions.every((color) => (color.outputs[main]?.weak ?? 0) < 3)
          ? "Contrast varies across this bar strip. Preview an accent to check the weaker areas."
          : "Suggestions prioritize the main bar. Preview an accent; copy its hex value to keep it.",
      )
      updateButtons()
    } catch (cause) {
      if (!cancel.is_cancelled()) {
        console.error("Wallpaper analysis:", cause)
        ratings.label = "Could not analyze this image."
        setStatus("Try another wallpaper.")
      }
    } finally {
      if (analysis === cancel) {
        analyzing = false
        updateButtons()
      }
    }
  }
  function select(path: string) {
    if (path === selected && image?.path === path) return
    if (openingPreview || preview) endPreview(false)
    selected = path
    remember()
    if (window.visible) void analyze()
    updateButtons()
  }
  function renderFiles() {
    if (!loaded) return
    const query = search.text.trim().toLowerCase()
    const paths = wallpapers.files
      .peek()
      .filter((path) => GLib.path_get_basename(path).toLowerCase().includes(query))
    const preferred = selected || wallpapers.current.peek()[primary()]
    const path = paths.includes(preferred) ? preferred : (paths[0] ?? "")
    changingSelection = true
    if (
      paths.length !== renderedPaths.length ||
      paths.some((path, index) => path !== renderedPaths[index])
    ) {
      renderedPaths = paths
      selection.model = Gtk.StringList.new(paths)
    }
    selection.selected = path ? paths.indexOf(path) : Gtk.INVALID_LIST_POSITION
    changingSelection = false
    select(path)
  }
  selection.connect("notify::selected-item", () => {
    if (!changingSelection)
      select((selection.selected_item as Gtk.StringObject | null)?.string ?? "")
  })
  function cancelScrollRestore() {
    for (const tick of pendingTicks) scroller.remove_tick_callback(tick)
    pendingTicks.clear()
    restoringScroll = false
  }
  search.connect("search-changed", () => {
    cancelScrollRestore()
    scroll = 0
    scroller.vadjustment.value = 0
    renderFiles()
    remember()
  })
  scroller.vadjustment.connect("value-changed", () => {
    if (window.visible && loaded && !restoringScroll) {
      scroll = scroller.vadjustment.value
      remember()
    }
  })

  async function apply(output?: string) {
    if (await wallpapers.apply(selected, output))
      setStatus(
        `Wallpaper applied to ${output ?? "all monitors"}. Your configured accent is unchanged.`,
      )
  }
  function endPreview(showPicker = true) {
    if (statusMessage.peek() === previewLoading) setStatus("")
    setColorOpen(false)
    openingPreview?.cancel()
    openingPreview = undefined
    const previous = preview
    preview = undefined
    previous?.dispose()
    if (previous && showPicker) {
      backdrop.present()
      window.present()
      previewButton.grab_focus()
    }
    updateButtons()
  }
  async function startPreview() {
    setColorOpen(false)
    if (!selected || preview || openingPreview) return
    const monitor = monitors().find((candidate) => candidate.connector === target) ?? monitors()[0]
    const bar = app.get_window(`bar-${monitor?.connector}`) as Astal.Window | null
    if (!monitor || !bar?.get_child()) {
      setStatus("The bar is unavailable for preview.")
      return
    }
    const cancel = (openingPreview = new Gio.Cancellable())
    updateButtons()
    setStatus(previewLoading)
    try {
      const geometry = monitor.get_geometry()
      const texture = await images.preview(
        selected,
        Math.max(geometry.width, geometry.height) * monitor.get_scale_factor(),
        cancel,
      )
      if (cancel.is_cancelled()) return
      preview = createWallpaperPreview({
        monitor,
        bar,
        texture,
        path: selected,
        paths: renderedPaths,
        images,
        colors: {
          section: accentSection,
          custom,
          value: colorValue,
          ratings,
          current: () => accent,
          select: (hex, updateEditor) => {
            if (image?.path === selected)
              showAccent(scoreAccent(hex, image.histograms, primary()), updateEditor)
          },
          ready: () => !analyzing && image?.path === selected,
          editorOpen: () => colorOpen.peek(),
          closeEditor: () => setColorOpen(false),
        },
        setTheme: (color) => theme.set(color),
        onSelect: (path) => {
          selected = path
          changingSelection = true
          selection.selected = renderedPaths.indexOf(path)
          changingSelection = false
          remember()
          void analyze()
        },
        onClose: () => endPreview(),
        onLoadingChanged: updateButtons,
      })
      preview.present()
      backdrop.visible = false
      window.visible = false
    } catch (cause) {
      if (!cancel.is_cancelled()) {
        console.error("Wallpaper preview:", cause)
        setStatus("Could not open the fullscreen preview.")
      }
      if (openingPreview === cancel) endPreview(false)
    } finally {
      if (openingPreview === cancel) {
        openingPreview = undefined
        if (statusMessage.peek() === previewLoading) setStatus("")
      }
      updateButtons()
    }
  }

  function hide() {
    resetCopyFeedback()
    openRequest++
    analysis?.cancel()
    cancelScrollRestore()
    endPreview(false)
    saveTimer?.cancel()
    saveTimer = undefined
    wallpapers.save({ selected, search: search.text, scroll })
    window.visible = false
    backdrop.visible = false
  }
  window.connect("close-request", () => {
    hide()
    return true
  })
  function focusGrid() {
    grid.grab_focus()
    if (selection.selected !== Gtk.INVALID_LIST_POSITION)
      grid.scroll_to(selection.selected, Gtk.ListScrollFlags.FOCUS, null)
  }
  function hasFocus(widget: Gtk.Widget) {
    // Wrapping internal grid rows can defer their teardown until JS garbage collection.
    return Boolean(widget.get_state_flags() & Gtk.StateFlags.FOCUS_WITHIN)
  }
  const keys = new Gtk.EventControllerKey({ propagation_phase: Gtk.PropagationPhase.CAPTURE })
  keys.connect(
    "key-pressed",
    (_controller, key: number, _code: number, state: Gdk.ModifierType) => {
      if (key === Gdk.KEY_Escape) {
        if (colorOpen.peek()) setColorOpen(false)
        else if (monitorMenu.visible) monitorMenu.popdown()
        else hide()
        return true
      }
      if (colorOpen.peek() || monitorMenu.visible) return false
      const browsing = hasFocus(grid)
      const searching = hasFocus(search)
      const modifiers =
        state &
        (Gdk.ModifierType.CONTROL_MASK |
          Gdk.ModifierType.ALT_MASK |
          Gdk.ModifierType.SUPER_MASK |
          Gdk.ModifierType.HYPER_MASK |
          Gdk.ModifierType.META_MASK)
      if (modifiers === Gdk.ModifierType.CONTROL_MASK && (key === Gdk.KEY_f || key === Gdk.KEY_F)) {
        search.grab_focus()
        search.select_region(0, -1)
        return true
      }
      if (browsing && !modifiers) {
        const character = String.fromCodePoint(Gdk.keyval_to_unicode(key))
        if (/^[\p{L}\p{N}]$/u.test(character)) {
          search.grab_focus()
          search.text = character
          search.set_position(-1)
          return true
        }
      }
      if (key === Gdk.KEY_Down && searching) {
        focusGrid()
        return true
      }
      if (key === Gdk.KEY_space && browsing) {
        void startPreview()
        return true
      }
      if ((key === Gdk.KEY_Return || key === Gdk.KEY_KP_Enter) && (searching || browsing)) {
        renderFiles()
        if (applyAll.sensitive) void apply()
        return true
      }
      return false
    },
  )
  window.add_controller(keys)
  const outside = new Gtk.GestureClick({
    button: 0,
    propagation_phase: Gtk.PropagationPhase.CAPTURE,
  })
  outside.connect("pressed", (gesture) => {
    if (colorOpen.peek() || monitorMenu.visible) return
    gesture.set_state(Gtk.EventSequenceState.CLAIMED)
    hide()
  })
  backdrop.add_controller(outside)
  createEffect(() => {
    wallpapers.files()
    renderFiles()
  })
  createEffect(() => {
    wallpapers.colors()
    renderPalette()
    updateButtons()
  })
  createEffect(() => {
    wallpapers.current()
    wallpapers.busy()
    for (const cell of cells.values()) updateBadge(cell)
    updateButtons()
  })
  createEffect(() => {
    status.label =
      wallpapers.error() || (wallpapers.busy() ? "Applying wallpaper…" : statusMessage())
  })

  async function show() {
    const request = ++openRequest
    const monitor =
      monitors().find((candidate) => candidate.connector === focusedOutput()) ??
      monitors().find((candidate) => candidate.connector === "DP-1") ??
      monitors()[0]
    if (!monitor) return
    target = monitor.connector ?? target
    priority.tooltip_text = `${primary()} has 90% of the weight; other monitors share 10%. Scores assume this wallpaper on each monitor.`
    window.gdkmonitor = monitor
    backdrop.gdkmonitor = monitor
    const geometry = monitor.get_geometry()
    backdrop.set_default_size(geometry.width, geometry.height)
    // Fit roughly five columns and four rows at the current thumbnail size.
    card.width_request = Math.min(1280, geometry.width - 80)
    card.height_request = Math.min(1144, geometry.height - 80)
    window.set_default_size(card.width_request, card.height_request)
    grid.max_columns = Math.max(1, Math.floor((card.width_request - 42) / 220))
    monitorChoices.remove_all()
    monitorAction.set_state(new GLib.Variant("s", target))
    for (const output of outputs()) {
      const item = Gio.MenuItem.new(
        `${output.name}${output.name === primary() ? " · Main" : ""}`,
        null,
      )
      item.set_action_and_target_value("wallpaper.monitor", new GLib.Variant("s", output.name))
      monitorChoices.append_item(item)
    }
    const restore = scroll
    restoringScroll = true
    backdrop.present()
    window.present()
    grid.grab_focus()
    await wallpapers.refresh()
    if (request !== openRequest || !window.visible) return
    loaded = true
    // File-version checks invalidate replaced images without dropping warm caches.
    for (const cell of cells.values()) {
      cell.cancel?.cancel()
      cell.requested = ""
    }
    thumbnailRevision++
    const previousAnalysis = analysis
    const browsing = hasFocus(grid)
    renderFiles()
    if (browsing) focusGrid()
    if (analysis === previousAnalysis) void analyze()
    if (!window.visible) return
    // Wait for the new model's allocations before restoring the adjustment.
    let frames = 0
    const tick = scroller.add_tick_callback(() => {
      if (++frames < 2) return true
      pendingTicks.delete(tick)
      scroller.vadjustment.value = Math.min(
        restore,
        Math.max(0, scroller.vadjustment.upper - scroller.vadjustment.page_size),
      )
      scroll = scroller.vadjustment.value
      restoringScroll = false
      return false
    })
    // A hidden window may not produce a frame before shutdown.
    pendingTicks.add(tick)
  }
  onCleanup(() => {
    colorEditor.disconnect(colorChanged)
    ratings.disconnect(ratingsParentChanged)
    hide()
    for (const cell of cells.values()) cell.cancel?.cancel()
    disconnectThumbnails()
    Gtk.StyleContext.remove_provider_for_display(display, colorStyle)
    window.destroy()
    backdrop.destroy()
  })
  return {
    toggle() {
      if (window.visible || preview || openingPreview) hide()
      else void show()
    },
    endPreview,
    reloadCss(next: string) {
      theme.reload(next)
      if (loaded && (window.visible || preview)) void analyze()
    },
  }
}
