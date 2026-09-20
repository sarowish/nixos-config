import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import GdkPixbuf from "gi://GdkPixbuf?version=2.0"
import { Gdk } from "ags/gtk4"

export type MpdArt = { texture: Gdk.Texture }

export async function loadMpdArt(
  file: string,
  cancellable: Gio.Cancellable,
): Promise<MpdArt | null> {
  for (const command of ["readpicture", "albumart"]) {
    if (cancellable.is_cancelled()) return null
    try {
      const process = Gio.Subprocess.new(
        ["mpc", command, "--", file],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
      )
      const cancelled = cancellable.connect(() => process.force_exit())
      const bytes = await new Promise<GLib.Bytes | null>((resolve, reject) => {
        process.communicate_async(null, cancellable, (_source, result) => {
          cancellable.disconnect(cancelled)
          try {
            const [, stdout] = process.communicate_finish(result)
            resolve(process.get_successful() ? stdout : null)
          } catch (error) {
            reject(error)
          }
        })
      })
      if (!bytes?.get_size()) continue
      const stream = Gio.MemoryInputStream.new_from_bytes(bytes)
      const pixbuf = await new Promise<GdkPixbuf.Pixbuf>((resolve, reject) => {
        GdkPixbuf.Pixbuf.new_from_stream_at_scale_async(
          stream,
          600,
          600,
          true,
          cancellable,
          (_source, result) => {
            try {
              resolve(GdkPixbuf.Pixbuf.new_from_stream_finish(result))
            } catch (error) {
              reject(error)
            } finally {
              stream.close(null)
            }
          },
        )
      })
      return { texture: Gdk.Texture.new_for_pixbuf(pixbuf) }
    } catch {
      // Covers are optional; try MPD's directory artwork after embedded artwork.
    }
  }
  return null
}
