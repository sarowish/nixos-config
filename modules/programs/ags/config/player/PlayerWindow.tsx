import type { Accessor } from "ags"
import { Gtk } from "ags/gtk4"
import type { createMpd } from "../services/mpd"
import PopupWindow from "../widgets/PopupWindow"
import Player from "./Player"

export default function PlayerWindow({
  anchor,
  mpd,
  open,
  onClose,
}: {
  anchor: Gtk.Widget
  mpd: ReturnType<typeof createMpd>
  open: Accessor<boolean>
  onClose: () => void
}) {
  return PopupWindow({
    anchor,
    child: Player({ mpd }),
    open,
    onClose,
    name: "player",
    className: "Player",
    align: "start",
  })
}
