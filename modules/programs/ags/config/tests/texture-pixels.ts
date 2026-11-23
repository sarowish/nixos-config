import { Gdk } from "ags/gtk4"

export function texturePixels(texture: Gdk.Texture) {
  const downloader = Gdk.TextureDownloader.new(texture)
  downloader.set_format(Gdk.MemoryFormat.R8G8B8A8)
  const [bytes, stride] = downloader.download_bytes()
  return {
    width: texture.get_width(),
    height: texture.get_height(),
    stride,
    channels: 4,
    pixels: bytes.get_data()!,
  }
}
