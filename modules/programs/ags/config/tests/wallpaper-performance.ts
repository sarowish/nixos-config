// Run with: direnv exec . ags run --gtk 4 tests/wallpaper-performance.ts
// No desktop windows or wallpaper changes are made by this integration check.
import GLib from "gi://GLib?version=2.0"
import Gio from "gi://Gio?version=2.0"
import GdkPixbuf from "gi://GdkPixbuf?version=2.0"
import { createRoot } from "ags"
import { createWallpaperImages } from "../services/wallpaper-images"
import { scoreAccent } from "../services/wallpaper-colors"

const loop = new GLib.MainLoop(null, false)
const directory = GLib.dir_make_tmp("ags-wallpaper-test-XXXXXX")
const path = `${directory}/large.png`
const source = GdkPixbuf.Pixbuf.new(GdkPixbuf.Colorspace.RGB, true, 8, 4096, 2160)
source.fill(0x283850ff)
source.savev(path, "png", ["compression"], ["0"])
const workerCache = `${GLib.get_user_cache_dir()}/ags/wallpaper-workers`
const pixelDirectory = `${GLib.get_user_runtime_dir()}/ags/wallpaper-pixels`
for (const folder of [workerCache, pixelDirectory]) GLib.mkdir_with_parents(folder, 0o700)
function fixture(folder: string, stale: boolean, extension = "pixels") {
  const path = `${folder}/${GLib.uuid_string_random()}.${extension}`
  GLib.file_set_contents(path, "test")
  if (stale)
    Gio.File.new_for_path(path).set_attribute_uint64(
      "time::modified",
      Math.floor(GLib.get_real_time() / 1000000) - 2 * 24 * 60 * 60,
      Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
      null,
    )
  return path
}
const oldPixels = [fixture(workerCache, true), fixture(pixelDirectory, true)]
const retained = [
  fixture(workerCache, false),
  fixture(pixelDirectory, false),
  fixture(pixelDirectory, true, "txt"),
]
const now = () => GLib.get_monotonic_time() / 1000
let previous = now()
let maxGap = 0
let beats = 0
// Idle priority also detects I/O callbacks starving GTK's layout/paint phases.
const heartbeat = GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, 10, () => {
  const time = now()
  maxGap = Math.max(maxGap, time - previous)
  previous = time
  beats++
  return true
})
let failure: unknown
createRoot((dispose) => {
  const images = createWallpaperImages()
  const start = now()
  const thumbnailBatch = new Gio.Cancellable()
  const thumbnails = Array.from({ length: 8 }, () => images.thumbnail(path, thumbnailBatch))
  const cancelled = new Gio.Cancellable()
  const abandoned = images
    .analyze(
      path,
      [],
      "DP-1",
      {
        accent: "#f75663",
        background: "#1e1e2e",
        foreground: "#d9e0ee",
      },
      cancelled,
    )
    .then(
      () => {
        throw new Error("Cancelled analysis completed")
      },
      () => {},
    )
  cancelled.cancel()
  const analysis = images.analyze(
    path,
    [
      { name: "DP-1", width: 2560, height: 1440, barHeight: 30, margin: 8 },
      { name: "HDMI-A-1", width: 1920, height: 1080, barHeight: 30, margin: 8 },
    ],
    "DP-1",
    { accent: "#f75663", background: "#1e1e2e", foreground: "#d9e0ee" },
    new Gio.Cancellable(),
  )
  void Promise.all([Promise.all(thumbnails), analysis, abandoned])
    .then(async ([textures, result]) => {
      if (oldPixels.some((path) => GLib.file_test(path, GLib.FileTest.EXISTS)))
        throw new Error("Abandoned pixel files were not recovered")
      if (retained.some((path) => !GLib.file_test(path, GLib.FileTest.EXISTS)))
        throw new Error("Pixel cleanup removed a fresh or unrelated file")
      if (textures.some((texture) => !texture || texture.get_width() > 360))
        throw new Error("Thumbnail preparation failed")
      if (!result.suggestions.length || result.suggestions.length > 8 || result.width !== 4096)
        throw new Error("Analysis worker returned invalid results")
      const rescored = scoreAccent(result.configured.hex, result.histograms, "DP-1")
      if (
        result.histograms.length !== 2 ||
        result.histograms.some(
          ({ histogram }) => histogram.reduce((sum, count) => sum + count, 0) !== 1920,
        ) ||
        Math.abs(rescored.outputs["DP-1"].weak - result.configured.outputs["DP-1"].weak) > 0.00001
      )
        throw new Error("Cached bar samples cannot score custom colors")
      const preview = await images.preview(path, 1920, new Gio.Cancellable())
      if (preview.get_width() !== 1920) throw new Error("Preview preparation failed")
      if (beats < 10 || maxGap > 250)
        throw new Error(`Event loop stalled for ${maxGap.toFixed(1)} ms`)
      console.log(
        JSON.stringify({
          elapsedMs: now() - start,
          maxEventLoopGapMs: maxGap,
          heartbeatTicks: beats,
        }),
      )
    })
    .catch((error) => {
      failure = error
    })
    .finally(() => {
      dispose()
      GLib.source_remove(heartbeat)
      Gio.File.new_for_path(path).delete(null)
      Gio.File.new_for_path(directory).delete(null)
      for (const path of [...oldPixels, ...retained]) {
        const file = Gio.File.new_for_path(path)
        if (file.query_exists(null)) file.delete(null)
      }
      loop.quit()
    })
})
loop.run()
if (failure) throw failure
