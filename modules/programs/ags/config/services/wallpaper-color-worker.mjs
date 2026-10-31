import { readFile } from "node:fs/promises"
import { suggestAccents, scoreAccent } from "./wallpaper-colors.ts"

const { pixels, image, outputs, primary, colors } = JSON.parse(process.argv[2])
const data = await readFile(pixels)
const result = suggestAccents(
  { ...image, pixels: data },
  outputs,
  primary,
  colors.background,
  colors.foreground,
)
process.stdout.write(
  JSON.stringify({
    width: image.originalWidth,
    height: image.originalHeight,
    suggestions: result.suggestions,
    histograms: result.histograms,
    configured: scoreAccent(colors.accent, result.histograms, primary),
  }),
)
