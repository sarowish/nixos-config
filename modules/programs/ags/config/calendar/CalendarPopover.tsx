import { createEffect, createMemo, createState, type Accessor } from "ags"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import PopupWindow from "../widgets/PopupWindow"
import { monthDates } from "./dates"

export default function CalendarPopover({
  anchor,
  now,
  open,
  onClose,
}: {
  anchor: Gtk.Widget
  now: Accessor<GLib.DateTime>
  open: Accessor<boolean>
  onClose: () => void
}) {
  function currentMonth() {
    const time = now.peek()
    return new Date(Date.UTC(time.get_year(), time.get_month() - 1, 1))
  }
  const [month, setMonth] = createState(currentMonth())
  const today = createMemo(() => now().format("%F") ?? "")
  const resetMonth = () => setMonth(currentMonth())
  createEffect(() => {
    if (open()) resetMonth()
  })
  function moveMonth(offset: number) {
    const current = month.peek()
    setMonth(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1)))
  }

  const grid = new Gtk.Grid({ column_homogeneous: true, column_spacing: 3, row_spacing: 3 })
  for (const [column, name] of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].entries()) {
    grid.attach(
      new Gtk.Label({
        label: name,
        css_classes: column > 4 ? ["day-name", "weekend"] : ["day-name"],
        height_request: 21,
      }),
      column,
      0,
      1,
      1,
    )
  }
  const days = Array.from({ length: 42 }, (_, index) => {
    const label = new Gtk.Label({
      halign: Gtk.Align.CENTER,
      width_request: 29,
      height_request: 29,
    })
    grid.attach(label, index % 7, Math.floor(index / 7) + 1, 1, 1)
    return label
  })

  createEffect(() => {
    const displayed = month()
    const todayKey = today()
    monthDates(displayed.getUTCFullYear(), displayed.getUTCMonth()).forEach((date, index) => {
      const localDate = GLib.DateTime.new_utc(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        12,
        0,
        0,
      )
      const classes = ["day"]
      if (index % 7 > 4) classes.push("weekend")
      if (date.getUTCMonth() !== displayed.getUTCMonth()) classes.push("outside")
      if (localDate.format("%F") === todayKey) classes.push("today")
      days[index].label = String(date.getUTCDate())
      days[index].css_classes = classes
      days[index].tooltip_text = localDate.format("%A, %-d %B %Y")
    })
  })

  const card = (
    <box class="calendar-card" orientation={Gtk.Orientation.VERTICAL} spacing={11} sensitive={open}>
      <centerbox>
        <button
          $type="start"
          class="nav"
          tooltipText="Previous month"
          onClicked={() => moveMonth(-1)}
        >
          <image iconName="pan-start-symbolic" pixelSize={16} />
        </button>
        <button
          $type="center"
          class="month"
          tooltipText="Return to the current month"
          onClicked={resetMonth}
          label={month(
            (date) =>
              GLib.DateTime.new_utc(
                date.getUTCFullYear(),
                date.getUTCMonth() + 1,
                1,
                12,
                0,
                0,
              ).format("%B %Y") ?? "",
          )}
        />
        <button $type="end" class="nav" tooltipText="Next month" onClicked={() => moveMonth(1)}>
          <image iconName="pan-end-symbolic" pixelSize={16} />
        </button>
      </centerbox>
      {grid}
    </box>
  ) as Gtk.Box
  return PopupWindow({
    anchor,
    child: card,
    open,
    onClose,
    name: "calendar",
    className: "CalendarPopover",
  })
}
