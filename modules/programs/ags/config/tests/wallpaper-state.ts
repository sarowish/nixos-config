// Run with: XDG_STATE_HOME=$(mktemp -d /tmp/ags-wallpaper-state-test-XXXXXX) direnv exec . ags run tests/wallpaper-state.ts --gtk 4
// Uses isolated state only; creates no windows and never contacts the wallpaper daemon.
import { createRoot } from "ags"
import { readFile, writeFileAsync } from "ags/file"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createWallpapers } from "../services/wallpapers"

const directory = GLib.get_user_state_dir()
if (!directory.startsWith(`${GLib.get_tmp_dir()}/ags-wallpaper-state-test-`))
  throw new Error("Run with an isolated XDG_STATE_HOME as shown above")
const path = `${directory}/ags/wallpapers.json`
if (GLib.file_test(path, GLib.FileTest.EXISTS)) throw new Error("Test state must start empty")
const loop = new GLib.MainLoop(null, false)
const disposers: (() => void)[] = []
let failure: unknown
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
function load() {
  return createRoot((dispose) => {
    disposers.push(dispose)
    return createWallpapers()
  })
}
async function until(predicate: () => boolean) {
  const start = GLib.get_monotonic_time()
  while (!predicate()) {
    if (GLib.get_monotonic_time() - start > 5000000) throw new Error("State write timed out")
    await new Promise<void>((resolve) =>
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10, () => {
        resolve()
        return false
      }),
    )
  }
}

void (async () => {
  const first = "/wallpapers/first.jpg"
  const second = "/wallpapers/second.jpg"
  await writeFileAsync(path, JSON.stringify({ selected: first, colors: ["#fbd2d0"] }))
  check(
    Object.keys(load().colors.peek()).length === 0,
    "Legacy global colors leak into a wallpaper",
  )
  await writeFileAsync(
    path,
    JSON.stringify({
      selected: first,
      search: "first",
      scroll: 25,
      colors: {
        [first]: ["#ABCDEF", "#abcdef", "invalid", 123],
        [second]: ["#3a9f87"],
        invalid: "#f75663",
      },
    }),
  )
  const state = load()
  check(
    state.colors.peek()[first]?.join() === "#abcdef",
    "Loaded colors are not validated and deduplicated",
  )
  check(!state.colors.peek().invalid, "Malformed wallpaper color list was loaded")
  state.addColor(first, "#DE787B")
  state.addColor(first, "#de787b")
  state.addColor(second, "#de787b")
  check(state.colors.peek()[first].length === 2, "Duplicate colors are saved")
  check(
    state.colors.peek()[second].includes("#de787b"),
    "A color cannot be saved independently for two wallpapers",
  )
  state.removeColor(first, "#DE787B")
  check(state.colors.peek()[second].includes("#de787b"), "Removal affects another wallpaper")
  state.addColor(first, "#f75663")
  state.removeColor(first, "#abcdef")
  state.save({ selected: second, search: "", scroll: 77 })
  await until(() => {
    const saved = JSON.parse(readFile(path))
    return (
      saved.selected === second &&
      saved.scroll === 77 &&
      saved.colors?.[first]?.join() === "#f75663" &&
      saved.colors?.[second]?.length === 2
    )
  })
  const restored = load()
  check(
    restored.colors.peek()[first].join() === "#f75663",
    "First wallpaper's colors are not restored",
  )
  check(
    restored.colors.peek()[second].includes("#de787b"),
    "Second wallpaper's colors are not restored",
  )
  check(
    restored.browsing.selected === second && restored.browsing.scroll === 77,
    "Color changes overwrite browsing state",
  )
  restored.removeColor(first, "#f75663")
  await until(() => !JSON.parse(readFile(path)).colors[first])
  check(
    restored.colors.peek()[second].length === 2,
    "Removing a wallpaper's last color changes another list",
  )
  console.log(
    "Wallpaper state passed: per-wallpaper isolation, validation, persistence, queued writes, empty-list removal, and discarded global test colors",
  )
})()
  .catch((error) => {
    failure = error
  })
  .finally(() => {
    try {
      for (const dispose of disposers) dispose()
      for (const entry of [path, `${directory}/ags`, directory]) {
        const file = Gio.File.new_for_path(entry)
        if (file.query_exists(null)) file.delete(null)
      }
    } catch (error) {
      failure ??= error
    } finally {
      loop.quit()
    }
  })
loop.run()
if (failure) throw failure
