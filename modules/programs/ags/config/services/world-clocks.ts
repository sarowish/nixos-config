import { createState } from "ags"
import { readFile } from "ags/file"
import GLib from "gi://GLib?version=2.0"
import { parseZoneTable, reorderClocks, savedClockIds } from "./world-clocks-state"

export function createWorldClocks() {
  const directory = `${GLib.get_user_state_dir()}/ags`
  const path = `${directory}/world-clocks.json`
  const [error, setError] = createState("")
  let catalog: ReturnType<typeof parseZoneTable> = []
  try {
    // zone.tab includes per-country locations that share a zone's clock rules.
    catalog = parseZoneTable(readFile("/etc/zoneinfo/zone.tab"))
  } catch (cause) {
    console.error("World clock time zones:", cause)
    setError("Could not load the available time zones.")
  }
  const available = new Set(catalog.map((zone) => zone.id))
  let initial: string[] = []
  try {
    if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
      initial = savedClockIds(JSON.parse(readFile(path)), available)
    }
  } catch (cause) {
    console.error("World clock preferences:", cause)
    setError("Could not read your saved clocks.")
  }
  const [saved, setSaved] = createState(initial)

  function save(next: string[]) {
    try {
      if (GLib.mkdir_with_parents(directory, 0o700) !== 0)
        throw new Error("Cannot create state directory")
      GLib.file_set_contents(path, `${JSON.stringify(next)}\n`)
      setSaved(next)
      setError("")
      return true
    } catch (cause) {
      console.error("Saving world clocks:", cause)
      setError("Could not save your clocks. Try again.")
      return false
    }
  }

  return {
    catalog,
    saved,
    error,
    add(id: string) {
      if (!available.has(id) || saved.peek().includes(id)) return false
      return save([...saved.peek(), id])
    },
    remove(id: string) {
      return save(saved.peek().filter((savedId) => savedId !== id))
    },
    move(id: string, target: string, after: boolean) {
      const current = saved.peek()
      const next = reorderClocks(current, id, target, after)
      return next !== null && (next === current || save(next))
    },
  }
}
