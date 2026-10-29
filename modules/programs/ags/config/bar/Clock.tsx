import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import GLib from "gi://GLib?version=2.0"
import Pango from "gi://Pango?version=1.0"

export default function Clock() {
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

  return (
    <box class="Clock" valign={Gtk.Align.CENTER} spacing={16}>
      <label
        class="weekday"
        widthRequest={90}
        xalign={1}
        valign={Gtk.Align.CENTER}
        label={now((time) => time.format("%A") ?? "")}
        $={(label: Gtk.Label) => calendarWidth.add_widget(label)}
      />
      <label
        class="time"
        attributes={attributes}
        valign={Gtk.Align.CENTER}
        label={now((time) => time.format("%H:%M:%S") ?? "")}
      />
      <label
        class="date"
        widthRequest={90}
        xalign={0}
        valign={Gtk.Align.CENTER}
        label={now((time) => time.format("%-d %B") ?? "")}
        $={(label: Gtk.Label) => calendarWidth.add_widget(label)}
      />
    </box>
  )
}
