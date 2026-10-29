import { createState } from "ags"
import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"
import CalendarPopover from "../calendar/CalendarPopover"
import WorldClocksPopover from "../world-clocks/WorldClocksPopover"
import type { createWorldClocks } from "../services/world-clocks"

export default function Clock({
  worldClocks,
}: {
  worldClocks: ReturnType<typeof createWorldClocks>
}) {
  const [panel, setPanel] = createState<"calendar" | "clocks" | null>(null)
  const now = createPoll(GLib.DateTime.new_now_local(), 1000, () => GLib.DateTime.new_now_local())
  const calendarWidth = new Gtk.SizeGroup({ mode: Gtk.SizeGroupMode.HORIZONTAL })
  const attributes = new Pango.AttrList()
  attributes.insert(Pango.attr_font_features_new("tnum"))
  // One text layout keeps the smaller seconds on the same baseline as HH:MM.
  for (const attribute of [
    Pango.attr_size_new_absolute(12 * Pango.SCALE),
    Pango.attr_foreground_alpha_new(49152),
    Pango.attr_weight_new(Pango.Weight.SEMIBOLD),
  ]) {
    attribute.start_index = 5
    attribute.end_index = 8
    attributes.insert(attribute)
  }

  const toggleCalendar = () => setPanel(panel.peek() === "calendar" ? null : "calendar")
  return (
    <box
      class="Clock"
      valign={Gtk.Align.CENTER}
      spacing={16}
      $={(anchor: Gtk.Box) => {
        CalendarPopover({
          anchor,
          now,
          open: panel((value) => value === "calendar"),
          onClose: () => setPanel((value) => (value === "calendar" ? null : value)),
        })
      }}
    >
      <button focusable={false} onClicked={toggleCalendar}>
        <label
          class="weekday"
          widthRequest={90}
          xalign={1}
          valign={Gtk.Align.CENTER}
          label={now((time) => time.format("%A") ?? "")}
          $={(label: Gtk.Label) => calendarWidth.add_widget(label)}
        />
      </button>
      <button
        focusable={false}
        onClicked={() => setPanel(panel.peek() === "clocks" ? null : "clocks")}
        $={(anchor: Gtk.Button) => {
          WorldClocksPopover({
            anchor,
            now,
            clocks: worldClocks,
            open: panel((value) => value === "clocks"),
            onClose: () => setPanel((value) => (value === "clocks" ? null : value)),
          })
        }}
      >
        <label
          class="time"
          attributes={attributes}
          valign={Gtk.Align.CENTER}
          label={now((time) => time.format("%H:%M:%S") ?? "")}
        />
      </button>
      <button focusable={false} onClicked={toggleCalendar}>
        <label
          class="date"
          widthRequest={90}
          xalign={0}
          valign={Gtk.Align.CENTER}
          label={now((time) => time.format("%-d %B") ?? "")}
          $={(label: Gtk.Label) => calendarWidth.add_widget(label)}
        />
      </button>
    </box>
  )
}
