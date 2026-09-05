import { createBinding, createEffect, For, onCleanup } from "ags"
import { Gtk, Gdk } from "ags/gtk4"
import AstalTray from "gi://AstalTray?version=0.1"

function TrayItem({ item }: { item: AstalTray.TrayItem }) {
  const menu = new Gtk.PopoverMenu({ has_arrow: false, position: Gtk.PositionType.TOP })
  function openMenu() {
    item.about_to_show()
    if (item.menu_model) menu.popup()
  }
  const button = (
    <button
      class="TrayItem"
      focusable={false}
      onClicked={() => (item.is_menu ? openMenu() : item.activate(0, 0))}
    >
      <Gtk.GestureClick
        button={Gdk.BUTTON_MIDDLE}
        onReleased={() => item.secondary_activate(0, 0)}
      />
      <Gtk.GestureClick button={Gdk.BUTTON_SECONDARY} onReleased={openMenu} />
      <Gtk.EventControllerScroll
        flags={Gtk.EventControllerScrollFlags.BOTH_AXES | Gtk.EventControllerScrollFlags.DISCRETE}
        onScroll={(_, dx, dy) => {
          if (dy) item.scroll(-Math.sign(dy), "vertical")
          if (dx) item.scroll(Math.sign(dx), "horizontal")
          return true
        }}
      />
      <image gicon={createBinding(item, "gicon")} pixelSize={16} />
    </button>
  ) as Gtk.Button
  menu.set_parent(button)
  const model = createBinding(item, "menu_model")
  const actions = createBinding(item, "action_group")
  createEffect(() => {
    menu.menu_model = model()
  })
  createEffect(() => {
    button.insert_action_group("dbusmenu", actions())
  })
  onCleanup(() => menu.unparent())
  return button
}

export default function Tray() {
  const items = createBinding(AstalTray.get_default(), "items")
  return (
    <box class="Tray" visible={items((current) => current.length > 0)} spacing={10}>
      <For each={items}>{(item: AstalTray.TrayItem) => <TrayItem item={item} />}</For>
    </box>
  )
}
