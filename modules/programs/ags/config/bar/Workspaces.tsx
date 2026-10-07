import { createMemo, For } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { focusWorkspace, type createNiri } from "../services/niri"
import { workspacesOnOutput } from "../services/niri-state"

export default function Workspaces({
  niri,
  output,
}: {
  niri: ReturnType<typeof createNiri>
  output: string
}) {
  const workspaces = niri.state((state) => workspacesOnOutput(state, output))
  const workspaceIds = createMemo(() => workspaces().map((workspace) => workspace.id), {
    equals: (left, right) =>
      left.length === right.length && left.every((id, index) => id === right[index]),
  })
  return (
    <box class="Workspaces" marginEnd={8} visible={workspaces((items) => items.length > 0)}>
      <Gtk.EventControllerScroll
        flags={Gtk.EventControllerScrollFlags.VERTICAL | Gtk.EventControllerScrollFlags.DISCRETE}
        onScroll={(_, _dx, dy) => {
          if (dy)
            void execAsync([
              "niri",
              "msg",
              "action",
              dy < 0 ? "focus-workspace-down" : "focus-workspace-up",
            ]).catch((error) => console.error("Niri scroll:", error))
          return true
        }}
      />
      <For each={workspaceIds}>
        {(id: number) => {
          const workspace = workspaces((items) => items.find((item) => item.id === id))
          return (
            <button
              class={workspace((item) =>
                item?.is_active ? "active" : item?.active_window_id != null ? "occupied" : "",
              )}
              focusable={false}
              onClicked={() => focusWorkspace(id)}
            >
              <box class="indicator" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
            </button>
          )
        }}
      </For>
    </box>
  )
}
