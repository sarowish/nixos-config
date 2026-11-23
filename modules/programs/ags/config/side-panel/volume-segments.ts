export function volumeSegments(width: number, volume: number) {
  width = Number.isFinite(width) ? Math.max(0, width) : 0
  volume = Number.isFinite(volume) ? Math.max(0, Math.min(1.5, volume)) : 0
  const gap = Math.min(5, width / 3)
  // Keep the split on pixel boundaries so it stays crisp.
  const normalWidth = Math.min(width - gap, Math.floor((width * 2) / 3))
  const boostStart = normalWidth + gap
  const boostWidth = width - boostStart
  return {
    normal: {
      x: 0,
      width: normalWidth,
      filled: normalWidth * Math.min(volume, 1),
      active: volume <= 1,
    },
    boost: {
      x: boostStart,
      width: boostWidth,
      filled: boostWidth * Math.max(0, (volume - 1) / 0.5),
      active: volume > 1,
    },
  }
}
