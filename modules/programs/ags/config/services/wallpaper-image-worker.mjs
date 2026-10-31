import GdkPixbuf from "gi://GdkPixbuf?version=2.0"
import Gio from "gi://Gio?version=2.0"

// Source-image decoding and resizing run in this process, never in AGS.
const { path, size, output } = JSON.parse(ARGV[0])
const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, size, size, true)
const [, originalWidth, originalHeight] = GdkPixbuf.Pixbuf.get_file_info(path)
let pixels = pixbuf.get_pixels()
const byteLength = pixbuf.rowstride * pixbuf.height
if (pixels.length < byteLength) {
  const padded = new Uint8Array(byteLength)
  padded.set(pixels)
  pixels = padded
}
const stream = Gio.File.new_for_path(output).create(Gio.FileCreateFlags.PRIVATE, null)
try {
  stream.write_all(pixels, null)
} finally {
  stream.close(null)
}
print(
  JSON.stringify({
    width: pixbuf.width,
    height: pixbuf.height,
    channels: pixbuf.n_channels,
    rowstride: pixbuf.rowstride,
    originalWidth,
    originalHeight,
  }),
)
