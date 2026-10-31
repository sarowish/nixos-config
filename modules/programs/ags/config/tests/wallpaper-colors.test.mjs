import assert from "node:assert/strict"
import test from "node:test"
import {
  barHistogram,
  contrast,
  contrastAgainstHistogram,
  contrastLabel,
  coverCrop,
  luminance,
  rgb,
  scoreAccent,
  suggestAccents,
  wallpaperColorAt,
} from "../services/wallpaper-colors.ts"

const output = { name: "DP-1", width: 100, height: 100, barHeight: 10, margin: 0 }
function image(width, height, paint) {
  const pixels = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixels.set(paint(x, y), (y * width + x) * 3)
  }
  return { width, height, pixels, channels: 3, rowstride: width * 3 }
}

test("contrast uses linearized sRGB luminance", () => {
  assert.equal(contrast(luminance(rgb("#000000")), luminance(rgb("#ffffff"))), 21)
  assert.equal(contrast(0.2, 0.2), 1)
  assert.ok(Math.abs(luminance(rgb("#808080")) - 0.21586) < 0.00001)
})

test("bar sampling uses the bottom of the centered monitor crop", () => {
  const source = image(200, 100, (x, y) =>
    x >= 50 && x < 150 && y >= 90 ? [255, 255, 255] : [0, 0, 0],
  )
  assert.deepEqual(coverCrop(200, 100, output), { scale: 1, x: 50, y: 0 })
  const histogram = barHistogram(source, output)
  assert.equal(histogram[255], 1920)
  assert.equal(histogram[0], 0)
  assert.equal(contrastAgainstHistogram(1, histogram).weak, 1)
})

test("a low-contrast patch is retained instead of being hidden by a good average", () => {
  const histogram = new Array(256).fill(0)
  histogram[0] = 900
  histogram[255] = 100
  const result = contrastAgainstHistogram(1, histogram)
  assert.equal(result.weak, 1)
  assert.equal(result.coverage, 0.9)
})

test("portrait images sample the bottom of the visible crop, not the original image", () => {
  const source = image(100, 200, (_x, y) => (y >= 140 && y < 150 ? [255, 255, 255] : [0, 0, 0]))
  assert.deepEqual(coverCrop(100, 200, output), { scale: 1, x: 0, y: 50 })
  assert.equal(barHistogram(source, output)[255], 1920)
})

test("eyedropper coordinates follow the centered preview crop and scaling", () => {
  const landscape = image(200, 100, (x, y) => [x, y, 17])
  const portrait = image(100, 200, (x, y) => [x, y, 17])
  assert.equal(wallpaperColorAt(landscape, { width: 100, height: 100 }, 0, 0), "#320011")
  assert.equal(wallpaperColorAt(landscape, { width: 100, height: 100 }, 99, 99), "#956311")
  assert.equal(wallpaperColorAt(portrait, { width: 100, height: 100 }, 10, 20), "#0a4611")
  assert.equal(wallpaperColorAt(landscape, { width: 2000, height: 1000 }, 105, 55), "#0a0511")
})

test("eyedropper colors respect alpha and padded image rows", () => {
  const source = {
    width: 2,
    height: 2,
    channels: 4,
    rowstride: 12,
    pixels: new Uint8Array([
      200, 100, 60, 128, 50, 100, 250, 255, 0, 0, 0, 0, 30, 60, 90, 255, 0, 0, 0, 0, 0, 0, 0, 0,
    ]),
  }
  assert.equal(wallpaperColorAt(source, { width: 20, height: 20 }, 0, 0), "#64321e")
  assert.equal(wallpaperColorAt(source, { width: 20, height: 20 }, 11, 0), "#3264fa")
  assert.equal(wallpaperColorAt(source, { width: 20, height: 20 }, 0, 11), "#1e3c5a")
})

test("narrow patches behind individual bar icons still affect the rating", () => {
  const histogram = new Array(256).fill(0)
  histogram[0] = 990
  histogram[255] = 10
  assert.equal(contrastAgainstHistogram(1, histogram).weak, 1)
})

test("primary and secondary monitors contribute 90 and 10 percent", () => {
  const dark = new Array(256).fill(0)
  const light = new Array(256).fill(0)
  dark[0] = 100
  light[255] = 100
  const histograms = [
    { name: "DP-1", histogram: dark },
    { name: "HDMI-A-1", histogram: light },
  ]
  const white = scoreAccent("#ffffff", histograms, "DP-1")
  const black = scoreAccent("#000000", histograms, "DP-1")
  assert.ok(white.score > black.score)
  const mainOnly = scoreAccent("#ffffff", [histograms[0]], "DP-1")
  const secondaryOnly = scoreAccent("#ffffff", [histograms[1]], "HDMI-A-1")
  assert.ok(Math.abs(white.score - (mainOnly.score * 0.9 + secondaryOnly.score * 0.1)) < 0.00001)
  assert.ok(
    scoreAccent("#000000", histograms, "HDMI-A-1").score >
      scoreAccent("#ffffff", histograms, "HDMI-A-1").score,
  )
})

test("suggestions score the bar region rather than the dominant image color", () => {
  const source = image(100, 100, (_x, y) => (y < 90 ? [220, 40, 60] : [12, 12, 20]))
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  assert.equal(suggestions.length, 8)
  assert.equal(new Set(suggestions.map((suggestion) => suggestion.hex)).size, 8)
  for (const suggestion of suggestions) {
    assert.ok(suggestion.outputs["DP-1"].weak >= 3)
    assert.ok(contrast(luminance(rgb(suggestion.hex)), luminance(rgb("#1e1e2e"))) >= 3)
  }
})

test("an impossible wallpaper strip produces honest weak ratings", () => {
  const source = image(100, 100, (x) => {
    const gray = Math.round((x * 255) / 99)
    return [gray, gray, gray]
  })
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  assert.ok(suggestions.length > 0)
  assert.ok(suggestions.every((suggestion) => suggestion.outputs["DP-1"].weak < 3))
})

test("readable wallpaper colors are kept exactly instead of replaced by a preset hue", () => {
  const source = image(100, 100, (x, y) =>
    y >= 90 ? [16, 16, 20] : x < 60 ? [216, 172, 120] : [112, 180, 152],
  )
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  const sampled = suggestions.filter((color) => color.source?.kind === "wallpaper")
  assert.ok(sampled.some((color) => color.hex === "#d8ac78"))
  assert.ok(sampled.some((color) => color.hex === "#70b498"))
})

test("dark wallpaper colors get a readable lightness variant with their source retained", () => {
  const source = image(100, 100, (_x, y) => (y >= 90 ? [16, 16, 16] : [112, 32, 24]))
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  const adjusted = suggestions.find((color) => color.source?.hex === "#702018")
  assert.equal(adjusted?.source.kind, "adjusted")
  assert.ok(luminance(rgb(adjusted.hex)) > luminance(rgb("#702018")))
  assert.ok(adjusted.outputs["DP-1"].weak >= 4.5)
  const [red, green, blue] = rgb(adjusted.hex)
  assert.ok(red > green && green > blue)
})

test("companion colors supplement the sampled palette and identify their wallpaper source", () => {
  const source = image(100, 100, (_x, y) => (y >= 90 ? [16, 16, 16] : [216, 172, 120]))
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  const companions = suggestions.filter((color) => color.source?.kind === "companion")
  assert.ok(suggestions.some((color) => color.hex === "#d8ac78"))
  assert.ok(companions.length > 0 && companions.length <= 2)
  for (const color of companions) {
    assert.equal(color.source.hex, "#d8ac78")
    assert.ok(!["#d8ac78", "#101010"].includes(color.hex))
    assert.ok(color.outputs["DP-1"].weak >= 4.5)
  }
  assert.ok(suggestions.length <= 8)
})

test("small colorful details survive a much larger neutral background", () => {
  const source = image(100, 100, (x, y) => (x < 5 && y < 90 ? [216, 172, 120] : [24, 24, 24]))
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  assert.ok(suggestions.some((color) => color.hex === "#d8ac78"))
})

test("neutral wallpapers keep neutral suggestions instead of inventing unrelated hues", () => {
  const source = image(100, 100, () => [32, 32, 32])
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  assert.ok(suggestions.length > 1 && suggestions.length <= 8)
  for (const color of suggestions) {
    assert.notEqual(color.source?.kind, "companion")
    const [red, green, blue] = rgb(color.hex)
    assert.equal(red, green)
    assert.equal(green, blue)
    assert.ok(color.outputs["DP-1"].weak >= 3)
  }
})

test("sampled colors with fair popover contrast remain available without being whitened", () => {
  const source = image(100, 100, (_x, y) => (y < 90 ? [69, 154, 131] : [8, 12, 20]))
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  assert.ok(
    suggestions.some((color) => color.hex === "#459a83" && color.source.kind === "wallpaper"),
  )
})

test("a sampled accent stays selectable when small bar patches have weak contrast", () => {
  const source = image(100, 100, (x, y) =>
    y < 90 ? [207, 112, 120] : x < 80 ? [12, 16, 24] : [135, 145, 155],
  )
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  const sampled = suggestions.find((color) => color.hex === "#cf7078")
  assert.ok(sampled)
  assert.equal(contrastLabel(sampled.outputs["DP-1"]), "Weak in places")
})

test("accent choices favor visible separation from the regular foreground", () => {
  const source = image(100, 100, (x, y) =>
    y >= 90 ? [12, 16, 24] : x < 75 ? [217, 224, 238] : [206, 100, 116],
  )
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  const distance = (color) => Math.hypot(...rgb(color).map((value, i) => value - rgb("#d9e0ee")[i]))
  assert.equal(suggestions[0].hex, "#ce6474")
  assert.ok(
    suggestions.filter((color) => distance(color.hex) >= 0.35).length > suggestions.length / 2,
  )
})

test("small colored details are retained among many shades of a dominant hue", () => {
  const source = image(64, 64, (x, y) =>
    y >= 58
      ? [8, 12, 20]
      : x >= 30 && x < 32 && y >= 30 && y < 32
        ? [58, 145, 120]
        : [8 + x, 50 + y, 110 + x],
  )
  const { suggestions } = suggestAccents(source, [output], "DP-1", "#1e1e2e", "#d9e0ee")
  assert.ok(suggestions.some((color) => color.hex === "#3a9178"))
})
