import { createState, onCleanup } from "ags"
import { readFile, writeFileAsync } from "ags/file"
import { execAsync } from "ags/process"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"

type BrowsingState = { selected: string; search: string; scroll: number }

export function wallpaperPaths(query: unknown): Record<string, string> {
  if (!query || typeof query !== "object") return {}
  const outputs = (query as Record<string, unknown>)[""]
  if (!Array.isArray(outputs)) return {}
  return Object.fromEntries(
    outputs.flatMap((output) =>
      typeof output?.name === "string" && typeof output?.displaying?.image === "string"
        ? [[output.name, output.displaying.image]]
        : [],
    ),
  )
}

export function createWallpapers() {
  const pictures =
    GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES) ??
    `${GLib.get_home_dir()}/Pictures`
  const directory = `${pictures}/Wallpapers`
  const stateDirectory = `${GLib.get_user_state_dir()}/ags`
  const statePath = `${stateDirectory}/wallpapers.json`
  const [files, setFiles] = createState<string[]>([])
  const [current, setCurrent] = createState<Record<string, string>>({})
  const [busy, setBusy] = createState(false)
  const [error, setError] = createState("")
  const [colors, setColors] = createState<Record<string, string[]>>({})
  let browsing: BrowsingState = { selected: "", search: "", scroll: 0 }
  try {
    if (GLib.file_test(statePath, GLib.FileTest.EXISTS)) {
      const saved = JSON.parse(readFile(statePath))
      if (saved?.colors && typeof saved.colors === "object" && !Array.isArray(saved.colors))
        setColors(
          Object.fromEntries(
            Object.entries(saved.colors).flatMap(([path, values]) => {
              if (!Array.isArray(values)) return []
              const entries = [
                ...new Set<string>(
                  values
                    .filter(
                      (color: unknown): color is string =>
                        typeof color === "string" && /^#[\da-f]{6}$/i.test(color),
                    )
                    .map((color: string) => color.toLowerCase()),
                ),
              ]
              return entries.length ? [[path, entries]] : []
            }),
          ),
        )
      browsing = {
        selected: typeof saved?.selected === "string" ? saved.selected : "",
        search: typeof saved?.search === "string" ? saved.search : "",
        scroll:
          typeof saved?.scroll === "number" && Number.isFinite(saved.scroll)
            ? Math.max(0, saved.scroll)
            : 0,
      }
    }
  } catch (cause) {
    console.error("Wallpaper browsing state:", cause)
  }
  const cancellable = new Gio.Cancellable()
  let refreshPromise: Promise<void> | undefined

  async function query() {
    setCurrent(wallpaperPaths(JSON.parse(await execAsync(["awww", "query", "--json"]))))
  }

  async function scan() {
    const folder = Gio.File.new_for_path(directory)
    const enumerator = await new Promise<Gio.FileEnumerator>((resolve, reject) => {
      folder.enumerate_children_async(
        "standard::name,standard::type",
        Gio.FileQueryInfoFlags.NONE,
        GLib.PRIORITY_DEFAULT,
        cancellable,
        (_source, result) => {
          try {
            resolve(folder.enumerate_children_finish(result))
          } catch (cause) {
            reject(cause)
          }
        },
      )
    })
    const paths: string[] = []
    try {
      while (!cancellable.is_cancelled()) {
        const batch = await new Promise<Gio.FileInfo[]>((resolve, reject) => {
          enumerator.next_files_async(
            100,
            GLib.PRIORITY_DEFAULT,
            cancellable,
            (_source, result) => {
              try {
                resolve(enumerator.next_files_finish(result))
              } catch (cause) {
                reject(cause)
              }
            },
          )
        })
        if (!batch.length) break
        for (const info of batch) {
          const name = info.get_name()
          if (
            info.get_file_type() === Gio.FileType.REGULAR &&
            /\.(png|jpe?g|webp|avif|bmp)$/i.test(name)
          )
            paths.push(`${directory}/${name}`)
        }
      }
    } finally {
      enumerator.close(null)
    }
    paths.sort((a, b) => a.localeCompare(b))
    if (JSON.stringify(paths) !== JSON.stringify(files.peek())) setFiles(paths)
  }

  let pendingSave: BrowsingState | undefined
  let writing = false
  async function flush() {
    writing = true
    while (pendingSave) {
      const next = pendingSave
      pendingSave = undefined
      try {
        await writeFileAsync(statePath, `${JSON.stringify({ ...next, colors: colors.peek() })}\n`)
      } catch (cause) {
        console.error("Saving wallpaper browsing state:", cause)
        setError("Could not save your place in the wallpaper collection.")
      }
    }
    writing = false
  }
  function save(next: BrowsingState) {
    browsing = next
    pendingSave = next
    if (!writing) void flush()
  }

  onCleanup(() => cancellable.cancel())
  return {
    directory,
    files,
    current,
    busy,
    error,
    colors,
    addColor(path: string, hex: string) {
      const color = hex.toLowerCase()
      const saved = colors.peek()[path] ?? []
      if (!path || !/^#[\da-f]{6}$/.test(color) || saved.includes(color)) return
      setColors({ ...colors.peek(), [path]: [...saved, color] })
      save(browsing)
    },
    removeColor(path: string, hex: string) {
      const color = hex.toLowerCase()
      if (!colors.peek()[path]?.includes(color)) return
      const next = { ...colors.peek() }
      const kept = next[path].filter((entry) => entry !== color)
      if (kept.length) next[path] = kept
      else delete next[path]
      setColors(next)
      save(browsing)
    },
    get browsing() {
      return browsing
    },
    save,
    refresh() {
      if (!refreshPromise) {
        setError("")
        refreshPromise = Promise.allSettled([scan(), query()])
          .then((results) => {
            for (const [index, result] of results.entries()) {
              if (result.status === "rejected" && !cancellable.is_cancelled()) {
                console.error("Loading wallpapers:", result.reason)
                setError(
                  index === 0
                    ? `Could not read ${directory}.`
                    : "Could not contact the wallpaper daemon.",
                )
              }
            }
          })
          .finally(() => {
            refreshPromise = undefined
          })
      }
      return refreshPromise
    },
    async apply(path: string, output?: string) {
      if (busy.peek() || !files.peek().includes(path)) return false
      setBusy(true)
      setError("")
      let success = false
      try {
        // Resolve the Home Manager wrapper through PATH, preserving overview sync.
        await execAsync([
          "awww",
          "img",
          ...(output ? ["--outputs", output] : []),
          "--resize",
          "crop",
          path,
        ])
        success = true
      } catch (cause) {
        console.error("Applying wallpaper:", cause)
        setError("The wallpaper or its blurred overview could not be updated.")
      } finally {
        // The image may have changed even when the wrapper's overview sync failed.
        try {
          await query()
        } catch {
          setError("Could not refresh the current wallpaper.")
        }
        setBusy(false)
      }
      return success
    },
  }
}
