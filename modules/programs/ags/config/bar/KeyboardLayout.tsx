import { Gtk, Gdk } from "ags/gtk4"
import { switchKeyboardLayout, type createNiri } from "../services/niri"

export default function KeyboardLayout({ niri }: { niri: ReturnType<typeof createNiri> }) {
  const layout = niri.state(({ keyboard }) => keyboard.names[keyboard.current_idx] ?? "")
  return (
    <button
      class="KeyboardLayout"
      visible={layout((name) => name.length > 0)}
      focusable={false}
      onClicked={() => switchKeyboardLayout("Next")}
    >
      <Gtk.GestureClick
        button={Gdk.BUTTON_SECONDARY}
        onReleased={() => switchKeyboardLayout("Prev")}
      />
      <box spacing={4}>
        <label class="accent" label="󰌌" />
        <label label={layout} />
      </box>
    </button>
  )
}
