import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { Gdk } from "ags/gtk4"
import { writeFileAsync } from "ags/file"
import { onCleanup } from "ags"
import imageWorker from "inline:./wallpaper-image-worker.mjs"
import colorWorker from "inline:./wallpaper-color-worker.mjs"
import colorSource from "inline:./wallpaper-colors.ts"
import type { AccentSuggestion, WallpaperOutput } from "./wallpaper-colors"

export type WallpaperAnalysis = {
  width: number
  height: number
  suggestions: AccentSuggestion[]
  configured: AccentSuggestion
  histograms: { name: string; histogram: number[] }[]
}
type PreparedImage = {
  width: number
  height: number
  channels: number
  rowstride: number
  originalWidth: number
  originalHeight: number
}
type Colors = { accent: string; background: string; foreground: string }

export function createWallpaperImages() {
  const root = `${GLib.get_user_cache_dir()}/ags/wallpaper-workers`
  const pixelsRoot = `${GLib.get_user_runtime_dir()}/ags/wallpaper-pixels`
  const version = GLib.compute_checksum_for_string(
    GLib.ChecksumType.SHA256,
    imageWorker + colorWorker + colorSource,
    -1,
  )!
  const assets = `${root}/${version}`
  let ready: Promise<unknown> | undefined
  const textures = new Map<string, Gdk.Texture>()
  const analyses = new Map<string, WallpaperAnalysis>()
  type Job = { start: () => void; cancel: Gio.Cancellable }
  const waiting: Job[] = []
  const active = new Set<Job>()

  function ensureAssets() {
    return (ready ??= (async () => {
      if (GLib.mkdir_with_parents(pixelsRoot, 0o700) !== 0)
        throw new Error("Cannot create temporary wallpaper directory")
      await Promise.all([
        writeFileAsync(`${assets}/wallpaper-image-worker.mjs`, imageWorker),
        writeFileAsync(`${assets}/wallpaper-color-worker.mjs`, colorWorker),
        writeFileAsync(`${assets}/wallpaper-colors.ts`, colorSource),
        writeFileAsync(`${assets}/package.json`, '{"type":"module"}\n'),
        removeOldPixels(root),
        removeOldPixels(pixelsRoot),
      ])
    })().catch((error) => {
      ready = undefined
      throw error
    }))
  }
  function pump() {
    while (active.size < 2 && waiting.length) waiting.shift()!.start()
  }
  async function schedule<T>(cancel: Gio.Cancellable, priority: boolean, task: () => Promise<T>) {
    if (cancel.is_cancelled()) throw new Error("Image job cancelled")
    let signal = 0
    return new Promise<T>((resolve, reject) => {
      const job: Job = {
        cancel,
        start() {
          active.add(job)
          void task()
            .then(resolve, reject)
            .finally(() => {
              active.delete(job)
              pump()
            })
        },
      }
      signal = cancel.connect(() => {
        const index = waiting.indexOf(job)
        if (index >= 0) {
          waiting.splice(index, 1)
          reject(new Error("Image job cancelled"))
        }
      })
      if (priority) waiting.unshift(job)
      else waiting.push(job)
      pump()
    }).finally(() => cancel.disconnect(signal))
  }
  async function run(command: string[], cancel: Gio.Cancellable) {
    if (cancel.is_cancelled()) throw new Error("Image job cancelled")
    const launcher = new Gio.SubprocessLauncher({
      flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    })
    launcher.unsetenv("LD_PRELOAD")
    const child = launcher.spawnv(command)
    const signal = cancel.connect(() => child.force_exit())
    if (cancel.is_cancelled()) child.force_exit()
    try {
      // Reap a cancelled process before removing its files or replacing its job.
      const stdout = await new Promise<string>((resolve, reject) => {
        child.communicate_utf8_async(null, null, (_source, result) => {
          try {
            const [, out, error] = child.communicate_utf8_finish(result)
            if (!child.get_successful()) throw new Error(error || "Wallpaper worker failed")
            resolve(out ?? "")
          } catch (error) {
            reject(error)
          }
        })
      })
      if (cancel.is_cancelled()) throw new Error("Image job cancelled")
      return JSON.parse(stdout)
    } finally {
      cancel.disconnect(signal)
    }
  }
  async function remove(path: string) {
    const file = Gio.File.new_for_path(path)
    await new Promise<void>((resolve) => {
      file.delete_async(GLib.PRIORITY_LOW, null, (_source, result) => {
        try {
          file.delete_finish(result)
        } catch {
          /* A cancelled job may not have written it. */
        }
        resolve()
      })
    })
  }
  async function removeOldPixels(directory: string) {
    // Recover interrupted jobs without touching fresh files from another AGS instance.
    const cutoff = GLib.get_real_time() / 1000000 - 24 * 60 * 60
    const folder = Gio.File.new_for_path(directory)
    try {
      const enumerator = await new Promise<Gio.FileEnumerator>((resolve, reject) => {
        folder.enumerate_children_async(
          "standard::name,standard::type,time::modified",
          Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
          GLib.PRIORITY_LOW,
          null,
          (_source, result) => {
            try {
              resolve(folder.enumerate_children_finish(result))
            } catch (error) {
              reject(error)
            }
          },
        )
      })
      try {
        while (true) {
          const batch = await new Promise<Gio.FileInfo[]>((resolve, reject) => {
            enumerator.next_files_async(50, GLib.PRIORITY_LOW, null, (_source, result) => {
              try {
                resolve(enumerator.next_files_finish(result))
              } catch (error) {
                reject(error)
              }
            })
          })
          if (!batch.length) break
          for (const info of batch) {
            if (
              info.get_file_type() === Gio.FileType.REGULAR &&
              /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\.pixels$/.test(info.get_name()) &&
              info.get_attribute_uint64("time::modified") < cutoff
            )
              await remove(folder.get_child(info.get_name()).get_path()!)
          }
        }
      } finally {
        enumerator.close(null)
      }
    } catch (error) {
      if (!(
        error instanceof GLib.Error &&
        error.matches(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND)
      ))
        console.warn("Cleaning temporary wallpaper files:", error)
    }
  }
  async function prepare<T>(
    path: string,
    size: number,
    cancel: Gio.Cancellable,
    consume: (image: PreparedImage, pixels: string) => Promise<T>,
  ) {
    await ensureAssets()
    const pixels = `${pixelsRoot}/${GLib.uuid_string_random()}.pixels`
    try {
      const image = (await run(
        [
          "gjs",
          "-m",
          `${assets}/wallpaper-image-worker.mjs`,
          JSON.stringify({ path, size, output: pixels }),
        ],
        cancel,
      )) as PreparedImage
      return await consume(image, pixels)
    } finally {
      await remove(pixels)
    }
  }
  async function texture(image: PreparedImage, path: string, cancel: Gio.Cancellable) {
    const file = Gio.File.new_for_path(path)
    const bytes = await new Promise<GLib.Bytes>((resolve, reject) => {
      file.load_bytes_async(cancel, (_source, result) => {
        try {
          resolve(file.load_bytes_finish(result)[0])
        } catch (error) {
          reject(error)
        }
      })
    })
    return Gdk.MemoryTexture.new(
      image.width,
      image.height,
      image.channels === 4 ? Gdk.MemoryFormat.R8G8B8A8 : Gdk.MemoryFormat.R8G8B8,
      bytes,
      image.rowstride,
    )
  }
  async function fileVersion(path: string, cancel: Gio.Cancellable) {
    const file = Gio.File.new_for_path(path)
    const info = await new Promise<Gio.FileInfo>((resolve, reject) => {
      file.query_info_async(
        "time::modified,time::modified-usec,standard::size",
        Gio.FileQueryInfoFlags.NONE,
        GLib.PRIORITY_DEFAULT,
        cancel,
        (_source, result) => {
          try {
            resolve(file.query_info_finish(result))
          } catch (error) {
            reject(error)
          }
        },
      )
    })
    return `${path}:${info.get_attribute_uint64("time::modified")}:${info.get_attribute_uint32("time::modified-usec")}:${info.get_size()}`
  }
  onCleanup(() => {
    for (const job of [...waiting]) job.cancel.cancel()
    for (const job of active) job.cancel.cancel()
  })
  return {
    async thumbnail(path: string, cancel: Gio.Cancellable) {
      try {
        const key = await fileVersion(path, cancel)
        const cached = textures.get(key)
        if (cached) {
          textures.delete(key)
          textures.set(key, cached)
          return cached
        }
        return await schedule(cancel, false, async () => {
          const value = await prepare(path, 360, cancel, (image, pixels) =>
            texture(image, pixels, cancel),
          )
          textures.set(key, value)
          if (textures.size > 64) textures.delete(textures.keys().next().value!)
          return value
        })
      } catch {
        return null
      }
    },
    preview(path: string, size: number, cancel: Gio.Cancellable) {
      return schedule(cancel, true, () =>
        prepare(path, size, cancel, (image, pixels) => texture(image, pixels, cancel)),
      )
    },
    async analyze(
      path: string,
      outputs: WallpaperOutput[],
      primary: string,
      colors: Colors,
      cancel: Gio.Cancellable,
    ) {
      const key = JSON.stringify([await fileVersion(path, cancel), outputs, primary, colors])
      const cached = analyses.get(key)
      if (cached) return cached
      return schedule(cancel, true, async () => {
        const result = await prepare(
          path,
          1600,
          cancel,
          async (image, pixels) =>
            (await run(
              [
                "node",
                `${assets}/wallpaper-color-worker.mjs`,
                JSON.stringify({ image, pixels, outputs, primary, colors }),
              ],
              cancel,
            )) as WallpaperAnalysis,
        )
        analyses.set(key, result)
        if (analyses.size > 8) analyses.delete(analyses.keys().next().value!)
        return result
      })
    },
  }
}
