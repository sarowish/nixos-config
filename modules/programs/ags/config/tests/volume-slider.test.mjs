import assert from "node:assert/strict"
import test from "node:test"
import { volumeSegments } from "../side-panel/volume-segments.ts"

test("normal volume fills only the first segment, and 100% ends exactly at the split", () => {
  const normal = volumeSegments(300, 0.75)
  assert.equal(normal.normal.width, 200)
  assert.equal(normal.normal.filled, 150)
  assert.equal(normal.boost.x, 205)
  assert.equal(normal.boost.filled, 0)
  assert.equal(normal.normal.active, true)
  const full = volumeSegments(300, 1)
  assert.equal(full.normal.filled, 200)
  assert.equal(full.boost.filled, 0)
  assert.equal(full.normal.active, true)
})

test("boost fills independently and the hover cap moves to the boost segment", () => {
  const halfBoost = volumeSegments(300, 1.25)
  assert.equal(halfBoost.normal.filled, 200)
  assert.equal(halfBoost.boost.filled, 47.5)
  assert.equal(halfBoost.normal.active, false)
  assert.equal(halfBoost.boost.active, true)
  const maximum = volumeSegments(300, 1.5)
  assert.equal(maximum.boost.filled, 95)
  assert.equal(maximum.boost.x + maximum.boost.filled, 300)
})

test("empty, excessive and non-finite values cannot paint outside either segment", () => {
  for (const width of [0, 3, 300]) {
    for (const volume of [-1, 0, 0.01, 1, 1.25, 2, NaN]) {
      const segments = volumeSegments(width, volume)
      for (const segment of Object.values(segments)) {
        assert.ok(segment.filled >= 0)
        assert.ok(segment.filled <= segment.width)
        assert.ok(segment.x + segment.width <= width)
      }
    }
  }
  assert.equal(volumeSegments(300, 0).normal.filled, 0)
  assert.equal(volumeSegments(300, 2).boost.filled, 95)
})
