import assert from "node:assert/strict"
import test from "node:test"
import { popupPlacement } from "../widgets/popup-placement.ts"

test("the player's left edge stays fixed when the MPD section changes width", () => {
  for (const width of [80, 200, 800]) {
    const placement = popupPlacement(
      { x: 150, y: 1050, width, height: 30 },
      320,
      500,
      1920,
      "start",
    )
    assert.deepEqual(placement, { x: 150, y: 542 })
  }
})

test("the player stays within either screen edge", () => {
  assert.equal(
    popupPlacement({ x: 0, y: 1050, width: 100, height: 30 }, 320, 500, 1920, "start").x,
    8,
  )
  assert.equal(
    popupPlacement({ x: 1870, y: 1050, width: 50, height: 30 }, 320, 500, 1920, "start").x,
    1592,
  )
})

test("a tall player stays below the top screen edge", () => {
  assert.equal(
    popupPlacement({ x: 150, y: 400, width: 200, height: 30 }, 320, 500, 1920, "start").y,
    8,
  )
})

test("calendar and clock popups center above their anchors with an 8px gap", () => {
  assert.deepEqual(popupPlacement({ x: 900, y: 1050, width: 120, height: 30 }, 300, 320, 1920), {
    x: 810,
    y: 722,
  })
})

test("centered popups stay within the screen edges", () => {
  assert.equal(popupPlacement({ x: 0, y: 1050, width: 100, height: 30 }, 300, 320, 1920).x, 8)
  assert.equal(popupPlacement({ x: 1870, y: 1050, width: 50, height: 30 }, 300, 320, 1920).x, 1612)
})
