import type { NiriWindow } from "./niri-state"

const SPACING = 1

export interface WindowMapRectangle {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowMapTile extends WindowMapRectangle {
  window: NiriWindow
}

export interface WindowMapLayout {
  width: number
  height: number
  tiles: WindowMapTile[]
}

function divideHeight(windows: NiriWindow[], height: number) {
  const weights = windows.map((window) => Math.max(0, window.layout.tile_size[1]))
  const weightTotal = weights.reduce((total, weight) => total + weight, 0)
  const distributable = height - windows.length
  const shares = weights.map((weight) =>
    weightTotal > 0 ? (weight / weightTotal) * distributable : distributable / windows.length,
  )
  const heights = shares.map((share) => 1 + Math.floor(share))
  let remaining = height - heights.reduce((total, item) => total + item, 0)
  const remainderOrder = shares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((left, right) => right.remainder - left.remainder)

  for (let index = 0; remaining > 0; index++, remaining--)
    heights[remainderOrder[index % remainderOrder.length].index]++

  return heights
}

export function fitWindowMap(
  columns: NiriWindow[][],
  outputHeight: number,
  height: number,
): WindowMapLayout {
  if (outputHeight <= 0 || height <= 0) return { width: 0, height: Math.max(0, height), tiles: [] }

  const tiles: WindowMapTile[] = []
  let x = 0
  for (const column of columns.filter((item) => item.length > 0)) {
    // A one-pixel tile is the smallest useful click target. Extra windows cannot fit.
    const windows = column.slice(0, height)
    const spacing = windows.length * 2 - 1 <= height ? SPACING : 0
    const availableHeight = height - Math.max(0, windows.length - 1) * spacing
    let heights: number[]
    if (windows.length === 1) {
      const scaledHeight = Math.round((windows[0].layout.tile_size[1] / outputHeight) * height)
      heights = [Math.max(1, Math.min(height, scaledHeight))]
    } else heights = divideHeight(windows, availableHeight)
    const widestTile = Math.max(...windows.map((window) => window.layout.tile_size[0]))
    const width = Math.max(1, Math.round((widestTile / outputHeight) * height))
    let y = 0

    windows.forEach((window, index) => {
      const tileHeight = heights[index]
      tiles.push({ window, x, y, width, height: tileHeight })
      y += tileHeight + spacing
    })
    x += width + SPACING
  }

  return { width: Math.max(0, x - SPACING), height, tiles }
}

export function interpolateValue(from: number, to: number, progress: number) {
  const clamped = Math.max(0, Math.min(1, progress))
  const eased = 1 - (1 - clamped) ** 3
  return from + (to - from) * eased
}

export function interpolateRectangle(
  from: WindowMapRectangle,
  to: WindowMapRectangle,
  progress: number,
): WindowMapRectangle {
  return {
    x: interpolateValue(from.x, to.x, progress),
    y: interpolateValue(from.y, to.y, progress),
    width: interpolateValue(from.width, to.width, progress),
    height: interpolateValue(from.height, to.height, progress),
  }
}
