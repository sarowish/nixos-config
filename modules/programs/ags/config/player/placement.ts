export type Rectangle = { x: number; y: number; width: number; height: number }

export function playerPlacement(
  anchor: Rectangle,
  width: number,
  height: number,
  screenWidth: number,
) {
  const x = Math.max(8, Math.min(screenWidth - width - 8, anchor.x))
  return {
    x,
    y: Math.max(8, anchor.y - height - 8),
  }
}
