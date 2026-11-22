import { Gdk, Gtk } from "ags/gtk4"
import GObject from "gi://GObject?version=2.0"
import Graphene from "gi://Graphene?version=1.0"
import Gsk from "gi://Gsk?version=4.0"
import type { sampleWallpaper } from "../services/wallpaper-colors"

const radius = 100
const rimWidth = 5
const pixelSize = 10
const black = new Gdk.RGBA({ red: 0, green: 0, blue: 0, alpha: 1 })
const white = new Gdk.RGBA({ red: 1, green: 1, blue: 1, alpha: 1 })

function rect(x: number, y: number, width: number, height: number) {
  return new Graphene.Rect().init(x, y, width, height)
}

function outline(x: number, y: number, halfSize: number, radius = 0) {
  return new Gsk.RoundedRect().init_from_rect(
    rect(x - halfSize, y - halfSize, 2 * halfSize, 2 * halfSize),
    radius,
  )
}

function border(snapshot: Gtk.Snapshot, outline: Gsk.RoundedRect, width: number, color: Gdk.RGBA) {
  snapshot.append_border(outline, [width, width, width, width], [color, color, color, color])
}

export const WallpaperMagnifier = GObject.registerClass(
  class WallpaperMagnifier extends Gtk.Widget {
    private point?: ReturnType<typeof sampleWallpaper> & {
      texture: Gdk.Texture
      x: number
      y: number
    }

    showSample(
      texture: Gdk.Texture,
      x: number,
      y: number,
      sample: ReturnType<typeof sampleWallpaper>,
    ) {
      this.point = { texture, x, y, ...sample }
      this.queue_draw()
    }

    clearSample() {
      this.point = undefined
      this.queue_draw()
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot) {
      if (!this.point) return
      const { texture, x, y, column, row, color } = this.point
      const rim = new Gdk.RGBA()
      rim.parse(color)

      // Fill behind the lens so the inner edge blends into the rim without a gap.
      const outerRadius = radius + rimWidth
      const outer = outline(x, y, outerRadius, outerRadius)
      snapshot.push_rounded_clip(outer)
      snapshot.append_color(rim, outer.bounds)
      snapshot.pop()

      const inner = outline(x, y, radius, radius)
      snapshot.push_mask(Gsk.MaskMode.ALPHA)
      snapshot.push_rounded_clip(inner)
      snapshot.append_color(white, inner.bounds)
      snapshot.pop()
      snapshot.pop()

      // Composite transparent pixels over black before antialiasing the lens edge.
      // Leave a pixel around the mask so the rectangular clip cannot affect its edge.
      const imageBounds = rect(x - radius - 1, y - radius - 1, 2 * radius + 2, 2 * radius + 2)
      snapshot.push_clip(imageBounds)
      snapshot.append_color(black, imageBounds)
      snapshot.append_scaled_texture(
        texture,
        Gsk.ScalingFilter.NEAREST,
        rect(
          x - (column + 0.5) * pixelSize,
          y - (row + 0.5) * pixelSize,
          texture.get_width() * pixelSize,
          texture.get_height() * pixelSize,
        ),
      )
      snapshot.pop()
      snapshot.pop()

      border(snapshot, outline(x, y, pixelSize / 2 + 2), 1, black)
      border(snapshot, outline(x, y, pixelSize / 2 + 1), 1, white)
    }
  },
)
