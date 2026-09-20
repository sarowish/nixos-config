import assert from "node:assert/strict"
import test from "node:test"
import { playerPlacement } from "../player/placement.ts"

test("the player's left edge stays fixed when the MPD section changes width", () => {
  for (const width of [80, 200, 800]) {
    const placement = playerPlacement({ x: 150, y: 1050, width, height: 30 }, 320, 500, 1920)
    assert.deepEqual(placement, { x: 150, y: 542 })
  }
})

test("the player stays within either screen edge", () => {
  assert.equal(playerPlacement({ x: 0, y: 1050, width: 100, height: 30 }, 320, 500, 1920).x, 8)
  assert.equal(playerPlacement({ x: 1870, y: 1050, width: 50, height: 30 }, 320, 500, 1920).x, 1592)
})

test("a tall player stays below the top screen edge", () => {
  assert.equal(playerPlacement({ x: 150, y: 400, width: 200, height: 30 }, 320, 500, 1920).y, 8)
})
