import type { createNiri } from "../services/niri"

export default function KeyboardLayout({ niri }: { niri: ReturnType<typeof createNiri> }) {
  const layout = niri.state(({ keyboard }) => keyboard.names[keyboard.current_idx] ?? "")
  return (
    <box class="KeyboardLayout" visible={layout((name) => name.length > 0)} spacing={4}>
      <label class="accent" label="󰌌" />
      <label label={layout} />
    </box>
  )
}
