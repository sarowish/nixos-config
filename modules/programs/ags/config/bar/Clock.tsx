import { createComputed, createState } from "ags"
import { createPoll } from "ags/time"
import GLib from "gi://GLib?version=2.0"

export default function Clock() {
  const [alternate, setAlternate] = createState(false)
  const now = createPoll(GLib.DateTime.new_now_local(), 1000, () => GLib.DateTime.new_now_local())
  const label = createComputed(
    () => now().format(alternate() ? "%Y-%m-%d" : "%e %B %A %H:%M:%S") ?? "",
  )
  return (
    <button class="Clock" focusable={false} onClicked={() => setAlternate((value) => !value)}>
      <label label={label} />
    </button>
  )
}
