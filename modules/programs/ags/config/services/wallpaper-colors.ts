export type Rgb = readonly [number, number, number]
export type PixelImage = {
  width: number
  height: number
  rowstride: number
  channels: number
  pixels: Uint8Array
}
export type WallpaperOutput = {
  name: string
  width: number
  height: number
  barHeight: number
  margin: number
}
export type Contrast = { weak: number; coverage: number }
export type AccentSuggestion = {
  hex: string
  score: number
  outputs: Record<string, Contrast>
  source?: { hex: string; kind: "wallpaper" | "adjusted" | "companion" }
}

export function rgb(hex: string): Rgb {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error("Expected an RGB hex color")
  const channel = (index: number) => parseInt(hex.slice(index, index + 2), 16) / 255
  return [channel(1), channel(3), channel(5)]
}

export function luminance(color: Rgb) {
  const linear = color.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  )
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

export function contrast(first: number, second: number) {
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

// The same centered "cover" crop used by awww's default resize=crop.
export function coverCrop(
  width: number,
  height: number,
  output: Pick<WallpaperOutput, "width" | "height">,
) {
  const scale = Math.max(output.width / width, output.height / height)
  return {
    scale,
    x: (width - output.width / scale) / 2,
    y: (height - output.height / scale) / 2,
  }
}

function pixel(image: PixelImage, x: number, y: number): Rgb {
  const offset =
    Math.min(image.height - 1, Math.max(0, Math.floor(y))) * image.rowstride +
    Math.min(image.width - 1, Math.max(0, Math.floor(x))) * image.channels
  const alpha = image.channels === 4 ? image.pixels[offset + 3] / 255 : 1
  // awww fills transparent pixels with black by default.
  const channel = (index: number) => (image.pixels[offset + index] / 255) * alpha
  return [channel(0), channel(1), channel(2)]
}

export function barHistogram(image: PixelImage, output: WallpaperOutput) {
  const crop = coverCrop(image.width, image.height, output)
  const histogram = new Array<number>(256).fill(0)
  const height = Math.min(output.barHeight, output.height)
  const margin = Math.min(output.margin, output.width / 4)
  for (let column = 0; column < 320; column++) {
    const x = margin + ((column + 0.5) / 320) * (output.width - 2 * margin)
    for (let row = 0; row < 6; row++) {
      const y = output.height - height + ((row + 0.5) / 6) * height
      const value = luminance(pixel(image, crop.x + x / crop.scale, crop.y + y / crop.scale))
      histogram[Math.round(value * 255)]++
    }
  }
  return histogram
}

function histogramCoverage(value: number, histogram: number[], minimum: number) {
  const total = histogram.reduce((sum, count) => sum + count, 0)
  const readable = histogram.reduce(
    (sum, count, index) => sum + (contrast(value, index / 255) >= minimum ? count : 0),
    0,
  )
  return total ? readable / total : 0
}

export function contrastAgainstHistogram(value: number, histogram: number[]): Contrast {
  const total = histogram.reduce((sum, count) => sum + count, 0)
  if (!total) return { weak: 1, coverage: 0 }
  const regions = histogram
    .map((count, index) => ({ count, ratio: contrast(value, index / 255) }))
    .filter((region) => region.count > 0)
    .sort((a, b) => a.ratio - b.ratio)
  let count = 0
  let weak = regions[0].ratio
  for (const region of regions) {
    count += region.count
    weak = region.ratio
    // Ignore isolated samples, while retaining narrow patches behind bar icons.
    if (count >= total * 0.005) break
  }
  return { weak, coverage: histogramCoverage(value, histogram, 4.5) }
}

function hsl(color: Rgb): [number, number, number] {
  const max = Math.max(...color)
  const min = Math.min(...color)
  const delta = max - min
  const lightness = (max + min) / 2
  if (!delta) return [0, 0, lightness]
  const hue =
    max === color[0]
      ? (color[1] - color[2]) / delta
      : max === color[1]
        ? (color[2] - color[0]) / delta + 2
        : (color[0] - color[1]) / delta + 4
  return [(hue * 60 + 360) % 360, delta / (1 - Math.abs(2 * lightness - 1)), lightness]
}

function fromHsl(hue: number, saturation: number, lightness: number): Rgb {
  const a = saturation * Math.min(lightness, 1 - lightness)
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [channel(0), channel(8), channel(4)]
}

function hex(color: Rgb) {
  return `#${color
    .map((value) =>
      Math.round(value * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}

export function wallpaperColorAt(
  image: PixelImage,
  output: Pick<WallpaperOutput, "width" | "height">,
  x: number,
  y: number,
) {
  const crop = coverCrop(image.width, image.height, output)
  return hex(pixel(image, crop.x + x / crop.scale, crop.y + y / crop.scale))
}

function colorDistance(a: Rgb, b: Rgb) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function hueDistance(a: Rgb, b: Rgb) {
  const difference = Math.abs(hsl(a)[0] - hsl(b)[0])
  return Math.min(difference, 360 - difference)
}

function wallpaperPalette(image: PixelImage) {
  const groups = new Map<number, { sum: number[]; samples: Rgb[] }>()
  for (let row = 0; row < 64; row++) {
    for (let column = 0; column < 64; column++) {
      const color = pixel(
        image,
        ((column + 0.5) / 64) * image.width,
        ((row + 0.5) / 64) * image.height,
      )
      const key = color.reduce((key, channel) => key * 8 + Math.min(7, Math.floor(channel * 8)), 0)
      let group = groups.get(key)
      if (!group) {
        group = { sum: [0, 0, 0], samples: [] }
        groups.set(key, group)
      }
      for (let channel = 0; channel < 3; channel++) group.sum[channel] += color[channel]
      group.samples.push(color)
    }
  }
  const groupsByProminence = [...groups.values()]
    .map(({ sum, samples }) => {
      const average: Rgb = [
        sum[0] / samples.length,
        sum[1] / samples.length,
        sum[2] / samples.length,
      ]
      // Keep a real sampled color, rather than inventing a color between pixels.
      const color = samples.reduce((nearest, sample) =>
        colorDistance(sample, average) < colorDistance(nearest, average) ? sample : nearest,
      )
      const [, saturation] = hsl(color)
      return {
        color,
        count: samples.length,
        prominence: Math.sqrt(samples.length) * (0.25 + saturation),
      }
    })
    .sort((a, b) => b.prominence - a.prominence)
  const palette: Rgb[] = []
  const substantial = groupsByProminence.filter((group) => group.count >= 3)
  // Include smaller colored details before filling the palette with shades of the dominant hue.
  for (const { color } of substantial) {
    if (Math.max(...color) - Math.min(...color) < 0.06) continue
    if (palette.every((other) => hueDistance(color, other) >= 30)) palette.push(color)
    if (palette.length === 12) break
  }
  for (const group of substantial) {
    if (palette.length === 12) break
    if (palette.every((other) => colorDistance(group.color, other) >= 0.12))
      palette.push(group.color)
  }
  // Detailed images may have no frequently repeated color at this sample size.
  if (!palette.length && groupsByProminence.length) palette.push(groupsByProminence[0].color)
  return palette
}

export function scoreAccent(
  color: string,
  histograms: { name: string; histogram: number[] }[],
  primary: string,
): AccentSuggestion {
  const value = luminance(rgb(color))
  const outputs = Object.fromEntries(
    histograms.map(({ name, histogram }) => [name, contrastAgainstHistogram(value, histogram)]),
  )
  // Rank usable accents at 3:1 without changing the stricter displayed contrast ratings.
  const quality = Object.fromEntries(
    histograms.map(({ name, histogram }) => [
      name,
      Math.min(outputs[name].weak / 3, 1) * 0.25 + histogramCoverage(value, histogram, 3) * 0.75,
    ]),
  )
  const mainName = outputs[primary] ? primary : Object.keys(outputs)[0]
  const main = outputs[mainName]
  const secondary = Object.entries(outputs)
    .filter(([name]) => name !== mainName)
    .map(([name]) => quality[name])
  const score = main
    ? secondary.length
      ? quality[mainName] * 0.9 +
        (secondary.reduce((sum, sample) => sum + sample, 0) / secondary.length) * 0.1
      : quality[mainName]
    : 0
  return { hex: color, score, outputs }
}

export function suggestAccents(
  image: PixelImage,
  outputs: WallpaperOutput[],
  primary: string,
  background: string,
  foreground: string,
) {
  const histograms = outputs.map((output) => ({
    name: output.name,
    histogram: barHistogram(image, output),
  }))
  const base = rgb(background)
  const fg = rgb(foreground)
  const panel = luminance([
    base[0] * 0.92 + fg[0] * 0.08,
    base[1] * 0.92 + fg[1] * 0.08,
    base[2] * 0.92 + fg[2] * 0.08,
  ])
  function candidates(seed: Rgb, offset = 0) {
    const [hue, saturation, lightness] = hsl(seed)
    const companion = offset !== 0
    const source = hex(seed)
    const variants: AccentSuggestion[] = []
    for (let step = 0; step <= 25; step++) {
      const levels = step ? [lightness - step * 0.04, lightness + step * 0.04] : [lightness]
      for (const level of levels) {
        if (level < 0 || level > 1) continue
        const color =
          !companion && !step
            ? source
            : hex(fromHsl((hue + offset + 360) % 360, saturation * (companion ? 0.8 : 1), level))
        const value = luminance(rgb(color))
        if (Math.min(contrast(value, panel), contrast(value, luminance(base))) < 3) continue
        const rated = scoreAccent(color, histograms, primary)
        const channels = rgb(color)
        const separation = Math.min(colorDistance(channels, fg) / 0.45, 1)
        const chroma = Math.min((Math.max(...channels) - Math.min(...channels)) / 0.25, 1)
        // Keep the source color on ties, while favoring accents distinct from normal text.
        variants.push({
          ...rated,
          score: rated.score * 0.6 + separation * 0.25 + chroma * 0.15,
          source: {
            hex: source,
            kind: companion ? "companion" : color === source ? "wallpaper" : "adjusted",
          },
        })
      }
    }
    return variants
  }

  const palette = wallpaperPalette(image)
  const wallpaper: AccentSuggestion[] = []
  const companions: AccentSuggestion[] = []
  for (const seed of palette) {
    wallpaper.push(...candidates(seed))
    // A gray pixel has no meaningful hue from which to derive companion colors.
    if (hsl(seed)[1] < 0.12 || Math.max(...seed) - Math.min(...seed) < 0.06) continue
    for (const offset of [-30, 30, -45, 45, 180]) {
      companions.push(...candidates(seed, offset))
    }
  }
  wallpaper.sort((a, b) => b.score - a.score)
  companions.sort((a, b) => b.score - a.score)
  const selected: AccentSuggestion[] = []
  function select(candidates: AccentSuggestion[], limit: number, differentSources = false) {
    for (const candidate of candidates) {
      if (selected.length >= limit) break
      if (differentSources && selected.some((other) => other.source?.hex === candidate.source?.hex))
        continue
      if (
        candidate.source?.kind === "companion" &&
        selected.some((other) => {
          if (other.source?.kind !== "companion") return false
          return hueDistance(rgb(candidate.hex), rgb(other.hex)) < 20
        })
      )
        continue
      if (selected.every((other) => colorDistance(rgb(candidate.hex), rgb(other.hex)) >= 0.1))
        selected.push(candidate)
    }
  }
  // Keep sampled options alongside stronger variants, rather than whitening every source.
  select(
    wallpaper.filter((candidate) => candidate.source?.kind === "wallpaper"),
    5,
  )
  select(wallpaper, 6, true)
  select(wallpaper, 6)
  select(companions, Math.min(8, selected.length + 2))
  select(wallpaper, 8)
  return { suggestions: selected, histograms }
}

export function contrastLabel(sample: Contrast | undefined) {
  return !sample
    ? "Unavailable"
    : sample.weak >= 4.5
      ? "Good"
      : sample.weak >= 3
        ? "Fair"
        : "Weak in places"
}
