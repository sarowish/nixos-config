import type { createSystemStats } from "../services/system"

export default function SystemStats({ system }: { system: ReturnType<typeof createSystemStats> }) {
  return (
    <box spacing={8}>
      <box spacing={4}>
        <label class="accent" label="" />
        <label label={system.memory((value) => `${value} MiB`)} />
      </box>
      <box class="Cpu" spacing={4}>
        <label class="accent" label="" />
        <label label={system.cpu((value) => `${value}%`)} />
      </box>
    </box>
  )
}
