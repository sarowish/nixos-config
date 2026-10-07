import { createEffect, createMemo, createState, For, onCleanup } from "ags"
import { Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import Cairo from "cairo"
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
  const [hovered, setHovered] = createState(false)
  const [hoveredId, setHoveredId] = createState<number | null>(null)
  const numbers = new Gtk.Fixed()
  const items = new Map<number, { button: Gtk.Button; label: Gtk.Label }>()
  const revealer = new Gtk.Revealer({
    transition_type: Gtk.RevealerTransitionType.CROSSFADE,
    transition_duration: 180,
    child: numbers,
  })
  const popup = new Gtk.Popover({
    css_classes: ["WorkspaceNumbers"],
    position: Gtk.PositionType.TOP,
    has_arrow: false,
    autohide: false,
    can_target: false,
    focusable: false,
    child: revealer,
  })
  popup.set_offset(0, 8)
  // Let pointer events reach the workspace buttons underneath the labels.
  const inputRegion = new Cairo.Region()
  const makeClickThrough = () => popup.get_surface()?.set_input_region(inputRegion)
  let disconnectLayout: (() => void) | undefined
  const realized = popup.connect_after("realize", () => {
    disconnectLayout?.()
    const surface = popup.get_surface()!
    const layout = surface.connect_after("layout", makeClickThrough)
    disconnectLayout = () => surface.disconnect(layout)
    makeClickThrough()
  })
  const mapped = popup.connect_after("map", makeClickThrough)
  const root = (
    <box class="Workspaces" marginEnd={8} visible={workspaces((items) => items.length > 0)}>
      <Gtk.EventControllerMotion
        onEnter={() => setHovered(true)}
        onLeave={() => {
          setHovered(false)
          setHoveredId(null)
        }}
      />
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
          const label = (
            <label
              class={hoveredId((value) => (value === id ? "number hovered" : "number"))}
              label={workspace((item) => item?.idx.toString() ?? "")}
            />
          ) as Gtk.Label
          numbers.put(label, 0, 0)
          const button = (
            <button
              class={workspace((item) =>
                item?.is_active ? "active" : item?.active_window_id != null ? "occupied" : "",
              )}
              focusable={false}
              onClicked={() => focusWorkspace(id)}
            >
              <Gtk.EventControllerMotion
                onEnter={() => setHoveredId(id)}
                onLeave={() => setHoveredId(null)}
              />
              <box class="indicator" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
            </button>
          ) as Gtk.Button
          items.set(id, { button, label })
          onCleanup(() => {
            numbers.remove(label)
            items.delete(id)
          })
          return button
        }}
      </For>
    </box>
  ) as Gtk.Box
  popup.set_parent(root)

  // Follow the actual button allocations, including the circle-to-pill animation.
  function positionNumbers() {
    let height = 0
    for (const { button, label } of items.values()) {
      const [valid, bounds] = button.compute_bounds(root)
      if (!valid) continue
      const width = label.measure(Gtk.Orientation.HORIZONTAL, -1)[0]
      height = Math.max(height, label.measure(Gtk.Orientation.VERTICAL, -1)[0])
      numbers.move(label, bounds.get_x() + (bounds.get_width() - width) / 2, 0)
    }
    numbers.set_size_request(root.get_width(), height)
    popup.present()
    makeClickThrough()
  }

  let tickId: number | undefined
  createEffect(() => {
    if (hovered()) {
      positionNumbers()
      popup.popup()
      revealer.set_reveal_child(true)
      if (tickId === undefined)
        tickId = root.add_tick_callback(() => {
          if (!popup.get_visible()) {
            tickId = undefined
            return false
          }
          positionNumbers()
          return true
        })
    } else revealer.set_reveal_child(false)
  })
  const revealed = revealer.connect("notify::child-revealed", () => {
    if (!hovered.peek() && !revealer.get_child_revealed()) popup.popdown()
  })
  onCleanup(() => {
    if (tickId !== undefined) root.remove_tick_callback(tickId)
    revealer.disconnect(revealed)
    popup.disconnect(realized)
    popup.disconnect(mapped)
    disconnectLayout?.()
    popup.unparent()
  })
  return root
}
