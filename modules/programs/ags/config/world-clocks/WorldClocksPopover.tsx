import { createBinding, createEffect, createMemo, For, onCleanup, type Accessor } from "ags"
import { Gdk, Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import type { createWorldClocks } from "../services/world-clocks"
import { dayHint, matchesZone, zoneName } from "../services/world-clocks-state"
import PopupWindow from "../widgets/PopupWindow"

type WorldClocks = ReturnType<typeof createWorldClocks>

function clockDetail(time: GLib.DateTime, detail: string) {
  const offset = time.format("UTC%:z") ?? ""
  return detail ? `${offset} · ${detail}` : offset
}

function clearDropIndicator(row: Gtk.Widget) {
  row.remove_css_class("drop-before")
  row.remove_css_class("drop-after")
}

function ClockRow({
  now,
  id,
  clocks,
}: {
  now: Accessor<GLib.DateTime>
  id?: string
  clocks: WorldClocks
}) {
  const zone = id ? GLib.TimeZone.new_identifier(id) : null
  const time = createMemo(() => (zone ? now().to_timezone(zone)! : now()))
  const name = createMemo(() => zoneName(id ?? time().get_timezone().get_identifier()))
  return (
    <box
      name={id}
      class={
        id ? "clock-row" : clocks.saved((ids) => `clock-row local${ids.length ? " separated" : ""}`)
      }
      spacing={12}
      cursor={id ? Gdk.Cursor.new_from_name("grab", null) : null}
    >
      <box orientation={Gtk.Orientation.VERTICAL} spacing={3} hexpand valign={Gtk.Align.CENTER}>
        <label
          class="clock-name"
          xalign={0}
          ellipsize={Pango.EllipsizeMode.END}
          maxWidthChars={20}
          label={name((value) => value.city)}
        />
        <label
          class="clock-detail"
          xalign={0}
          ellipsize={Pango.EllipsizeMode.END}
          maxWidthChars={24}
          label={createMemo(() => clockDetail(time(), id ? name().region : "Local time"))}
        />
      </box>
      <box orientation={Gtk.Orientation.VERTICAL} spacing={3} valign={Gtk.Align.CENTER}>
        <label class="clock-time" xalign={1} label={time((value) => value.format("%H:%M") ?? "")} />
        <label
          class="day-hint"
          xalign={1}
          heightRequest={13}
          label={createMemo(() => dayHint(now().format("%F")!, time().format("%F")!))}
        />
      </box>
      {id ? (
        <button
          class="remove"
          valign={Gtk.Align.CENTER}
          tooltipText={`Remove ${zoneName(id).city}`}
          cursor={Gdk.Cursor.new_from_name("pointer", null)}
          onClicked={() => clocks.remove(id)}
        >
          <image iconName="window-close-symbolic" pixelSize={12} />
        </button>
      ) : (
        <box widthRequest={24} />
      )}
    </box>
  )
}

function SavedClocks({ now, clocks }: { now: Accessor<GLib.DateTime>; clocks: WorldClocks }) {
  const list = (
    <box orientation={Gtk.Orientation.VERTICAL}>
      <For each={clocks.saved}>{(id) => <ClockRow now={now} clocks={clocks} id={id} />}</For>
    </box>
  ) as Gtk.Box
  let drag: { row: Gtk.Widget; x: number; y: number; active: boolean } | undefined
  let target: { row: Gtk.Widget; after: boolean } | undefined
  let tick: number | undefined

  function clearTarget() {
    if (target) clearDropIndicator(target.row)
    target = undefined
  }
  function cancel() {
    drag?.row.remove_css_class("dragging")
    drag?.row.set_cursor_from_name("grab")
    drag = undefined
    clearTarget()
    if (tick !== undefined) scroller.remove_tick_callback(tick)
    tick = undefined
  }
  function updateTarget(x: number, y: number) {
    clearTarget()
    if (x < 0 || x >= list.get_width() || y < 0 || y >= scroller.get_height()) return
    for (let row = list.get_first_child(); row; row = row.get_next_sibling()) {
      const [ok, bounds] = row.compute_bounds(scroller)
      if (!ok || y < bounds.get_y() || y >= bounds.get_y() + bounds.get_height()) continue
      const after = y >= bounds.get_y() + bounds.get_height() / 2
      target = { row, after }
      row.add_css_class(after ? "drop-after" : "drop-before")
      return
    }
  }
  const gesture = (
    <Gtk.GestureDrag
      button={1}
      propagationPhase={Gtk.PropagationPhase.CAPTURE}
      onDragBegin={(gesture, x, y) => {
        cancel()
        let row = scroller.pick(x, y, Gtk.PickFlags.DEFAULT)
        const picked = row
        while (row && row.get_parent() !== list) row = row.get_parent()
        const remove = row?.get_last_child()
        if (!row || picked === remove || (remove && picked?.is_ancestor(remove))) {
          gesture.set_state(Gtk.EventSequenceState.DENIED)
          return
        }
        drag = { row, x, y, active: false }
      }}
      onDragUpdate={(gesture, dx, dy) => {
        if (!drag) return
        if (!drag.active) {
          if (!scroller.drag_check_threshold(drag.x, drag.y, drag.x + dx, drag.y + dy)) return
          drag.active = true
          drag.row.add_css_class("dragging")
          drag.row.set_cursor_from_name("grabbing")
          gesture.set_state(Gtk.EventSequenceState.CLAIMED)
          let lastFrame = 0
          tick = scroller.add_tick_callback((_widget, clock) => {
            const frame = clock.get_frame_time()
            const elapsed = lastFrame ? Math.min((frame - lastFrame) / 1_000_000, 0.05) : 0
            lastFrame = frame
            const [, dx, dy] = gesture.get_offset()
            const x = drag!.x + dx
            const y = drag!.y + dy
            if (x >= 0 && x < list.get_width() && y >= 0 && y < scroller.get_height()) {
              const edge = 24
              const speed = y < edge ? y - edge : Math.max(0, y - scroller.get_height() + edge)
              const adjustment = scroller.vadjustment
              adjustment.value = Math.max(
                adjustment.lower,
                Math.min(
                  adjustment.upper - adjustment.page_size,
                  adjustment.value + speed * 20 * elapsed,
                ),
              )
            }
            updateTarget(x, y)
            return true
          })
        }
        updateTarget(drag.x + dx, drag.y + dy)
      }}
      onDragEnd={(gesture, dx, dy) => {
        const source = drag
        const event = gesture.get_current_event()?.get_event_type()
        const released = event === Gdk.EventType.BUTTON_RELEASE || event === Gdk.EventType.TOUCH_END
        if (source?.active && released) updateTarget(source.x + dx, source.y + dy)
        const drop = target
        cancel()
        if (source?.active && released && drop)
          clocks.move(source.row.name, drop.row.name, drop.after)
      }}
      onCancel={cancel}
    />
  ) as Gtk.GestureDrag
  // A local gesture works inside the popover's grab without starting a Wayland data transfer.
  const scroller = (
    <scrolledwindow
      hscrollbarPolicy={Gtk.PolicyType.NEVER}
      vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
      overlayScrolling={false}
      propagateNaturalHeight
      maxContentHeight={260}
      visible={clocks.saved((ids) => ids.length > 0)}
      onUnmap={cancel}
    >
      {gesture}
      {list}
    </scrolledwindow>
  ) as Gtk.ScrolledWindow
  onCleanup(cancel)
  return scroller
}

export default function WorldClocksPopover({
  anchor,
  now,
  clocks,
  open,
  onClose,
}: {
  anchor: Gtk.Widget
  now: Accessor<GLib.DateTime>
  clocks: WorldClocks
  open: Accessor<boolean>
  onClose: () => void
}) {
  const minute = createMemo(() => {
    const time = now()
    return `${time.format("%F %H:%M %z")} ${time.get_timezone().get_identifier()}`
  })
  const current = createMemo(() => {
    minute()
    return now.peek()
  })
  const stack = new Gtk.Stack({ hhomogeneous: true, vhomogeneous: false })
  const search = new Gtk.SearchEntry({
    placeholder_text: "Search cities or time zones",
    hexpand: true,
    search_delay: 0,
  })
  const filter = new Gtk.CustomFilter()
  filter.set_filter_func((item) => {
    const id = (item as Gtk.StringObject).string
    return !clocks.saved.peek().includes(id) && matchesZone(id, search.text)
  })
  const results = new Gtk.FilterListModel({
    model: Gtk.StringList.new(clocks.catalog.map((zone) => zone.id)),
    filter,
  })
  const factory = new Gtk.SignalListItemFactory()
  const boundRows = new Map<Gtk.ListItem, () => void>()
  const setup = factory.connect("setup", (_factory, object) => {
    const item = object as Gtk.ListItem
    const labels = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 3, hexpand: true })
    labels.append(new Gtk.Label({ css_classes: ["clock-name"], xalign: 0 }))
    labels.append(new Gtk.Label({ css_classes: ["clock-detail"], xalign: 0 }))
    const row = new Gtk.Box({ spacing: 12 })
    row.append(labels)
    row.append(
      new Gtk.Image({ icon_name: "list-add-symbolic", pixel_size: 14, css_classes: ["add-icon"] }),
    )
    item.child = row
  })
  const bind = factory.connect("bind", (_factory, object) => {
    const item = object as Gtk.ListItem
    const zone = zoneName((item.item as Gtk.StringObject).string)
    const labels = item.child!.get_first_child()!
    const city = labels.get_first_child() as Gtk.Label
    const region = labels.get_last_child() as Gtk.Label
    city.label = zone.city
    const timezone = GLib.TimeZone.new_identifier(zone.id)
    const update = () => {
      region.label = clockDetail(current.peek().to_timezone(timezone)!, zone.region)
    }
    boundRows.set(item, update)
    update()
    item.child!.tooltip_text = `Add ${zone.city}`
  })
  const unbind = factory.connect("unbind", (_factory, object) => {
    boundRows.delete(object as Gtk.ListItem)
  })
  createEffect(() => {
    current()
    for (const update of boundRows.values()) update()
  })
  function add(position: number) {
    const item = results.get_item(position) as Gtk.StringObject | null
    if (item && clocks.add(item.string)) stack.visible_child_name = "clocks"
  }
  const list = new Gtk.ListView({
    model: new Gtk.NoSelection({ model: results }),
    factory,
    single_click_activate: true,
  })
  const activate = list.connect("activate", (_list, position) => add(position))
  const changed = search.connect("search-changed", () => filter.changed(Gtk.FilterChange.DIFFERENT))
  const entered = search.connect("activate", () => {
    filter.changed(Gtk.FilterChange.DIFFERENT)
    add(0)
  })
  const count = createBinding(results, "nItems")
  createEffect(() => {
    clocks.saved()
    filter.changed(Gtk.FilterChange.DIFFERENT)
  })
  onCleanup(() => {
    search.disconnect(changed)
    search.disconnect(entered)
    list.disconnect(activate)
    factory.disconnect(setup)
    factory.disconnect(bind)
    factory.disconnect(unbind)
    boundRows.clear()
    filter.set_filter_func(null)
  })

  stack.add_named(
    (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={8}>
        <box spacing={12}>
          <label class="heading" label="World clocks" xalign={0} hexpand />
          <button
            class="add-clock"
            sensitive={clocks.catalog.length > 0}
            onClicked={() => {
              search.text = ""
              filter.changed(Gtk.FilterChange.DIFFERENT)
              stack.visible_child_name = "picker"
              search.grab_focus()
            }}
          >
            <box spacing={5}>
              <image iconName="list-add-symbolic" pixelSize={14} />
              <label label="Add clock" />
            </box>
          </button>
        </box>
        <ClockRow now={current} clocks={clocks} />
        <SavedClocks now={current} clocks={clocks} />
      </box>
    ) as Gtk.Widget,
    "clocks",
  )
  stack.add_named(
    (
      <box orientation={Gtk.Orientation.VERTICAL} spacing={12}>
        <box spacing={8}>
          <button
            class="back"
            tooltipText="Back to clocks"
            onClicked={() => {
              stack.visible_child_name = "clocks"
            }}
          >
            <image iconName="go-previous-symbolic" pixelSize={16} />
          </button>
          <label class="heading" label="Add clock" />
        </box>
        {search}
        <label
          class="empty"
          label="No time zones found"
          heightRequest={240}
          visible={count((n) => n === 0)}
        />
        <scrolledwindow
          hscrollbarPolicy={Gtk.PolicyType.NEVER}
          vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
          overlayScrolling={false}
          minContentHeight={240}
          maxContentHeight={240}
          visible={count((n) => n > 0)}
        >
          {list}
        </scrolledwindow>
      </box>
    ) as Gtk.Widget,
    "picker",
  )

  createEffect(() => {
    if (open()) stack.visible_child_name = "clocks"
  })
  const card = (
    <box
      class="world-clocks-card"
      orientation={Gtk.Orientation.VERTICAL}
      spacing={8}
      sensitive={open}
    >
      {stack}
      <label
        class="error"
        label={clocks.error}
        visible={clocks.error((message) => !!message)}
        wrap
        xalign={0}
      />
    </box>
  ) as Gtk.Box
  const stopped = search.connect("stop-search", onClose)
  onCleanup(() => search.disconnect(stopped))
  return PopupWindow({
    anchor,
    child: card,
    open,
    onClose,
    name: "world-clocks",
    className: "WorldClocksPopover",
  })
}
