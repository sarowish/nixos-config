import { onCleanup } from "ags"
import { Gtk } from "ags/gtk4"
import GObject from "gi://GObject?version=2.0"
import Graphene from "gi://Graphene?version=1.0"
import Pango from "gi://Pango?version=1.0"

const ReadoutEntry = GObject.registerClass(
  class ReadoutEntry extends Gtk.Entry {
    composing = false

    vfunc_snapshot(snapshot: Gtk.Snapshot) {
      const text = this.get_delegate()
      if (
        !(text instanceof Gtk.Text) ||
        !text.has_focus ||
        this.composing ||
        this.get_selection_bounds()[0]
      ) {
        super.vfunc_snapshot(snapshot)
        return
      }

      const [cursor] = text.compute_cursor_extents(this.cursor_position)
      const layout = text.create_pango_layout(`0123456789:${this.text}`)
      const [ink] = layout.get_pixel_extents()
      const [referenceCursor] = layout.get_cursor_pos(0)
      const [positioned, bounds] = text.compute_bounds(this)
      if (!cursor || !ink || !referenceCursor || !positioned) {
        super.vfunc_snapshot(snapshot)
        return
      }

      // Keep GTK's native cursor position and blinking, trimming the unused
      // font ascent/descent while leaving room around the actual glyphs.
      const top = bounds.get_y() + cursor.get_y() + ink.y - referenceCursor.y / Pango.SCALE - 1
      snapshot.push_clip(new Graphene.Rect().init(0, top, this.get_width(), ink.height + 2))
      super.vfunc_snapshot(snapshot)
      snapshot.pop()
    }
  },
)

export function createReadoutEntry(properties: Partial<Gtk.Entry.ConstructorProps>) {
  const entry = new ReadoutEntry(properties)
  const text = entry.get_delegate()
  if (text instanceof Gtk.Text) {
    const preeditChanged = text.connect("preedit-changed", (_text, preedit) => {
      entry.composing = Boolean(preedit)
    })
    onCleanup(() => text.disconnect(preeditChanged))
  }
  return entry
}
