export type Rectangle = { x: number; y: number; width: number; height: number }

export function popupPlacement(
  anchor: Rectangle,
  width: number,
  height: number,
  screenWidth: number,
  align: "start" | "center" = "center",
) {
  const left = align === "center" ? anchor.x + (anchor.width - width) / 2 : anchor.x
  const x = Math.max(8, Math.min(screenWidth - width - 8, left))
  return {
    x,
    y: Math.max(8, anchor.y - height - 8),
  }
}
