import { For } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { focusWorkspace, type createNiri } from "../services/niri"
import { workspacesOnOutput, type Workspace } from "../services/niri-state"

export default function Workspaces({
  niri,
  output,
}: {
  niri: ReturnType<typeof createNiri>
  output: string
}) {
  const workspaces = niri.state((state) => workspacesOnOutput(state, output))
  return (
    <box class="Workspaces" visible={workspaces((items) => items.length > 0)}>
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
      <For each={workspaces}>
        {(workspace: Workspace) => (
          <button
            class={workspace.is_active ? "active" : ""}
            focusable={false}
            onClicked={() => focusWorkspace(workspace.id)}
          >
            <label label={workspace.is_active || workspace.active_window_id !== null ? "" : ""} />
          </button>
        )}
      </For>
    </box>
  )
}
