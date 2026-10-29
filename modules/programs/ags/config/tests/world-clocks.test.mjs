import assert from "node:assert/strict"
import test from "node:test"
import {
  dayHint,
  matchesZone,
  parseZoneTable,
  reorderClocks,
  savedClockIds,
} from "../services/world-clocks-state.ts"

test("the picker reads system zone data, preserves nested regions, and removes duplicate IDs", () => {
  const zones = parseZoneTable(
    "# comment\nUS\t+404251-0740023\tAmerica/New_York\nAR\t-3436-05827\tAmerica/Argentina/Buenos_Aires\tcomment\nUS\t+404251-0740023\tAmerica/New_York\n",
  )
  assert.deepEqual(zones, [
    { id: "America/Argentina/Buenos_Aires", city: "Buenos Aires", region: "America / Argentina" },
    { id: "America/New_York", city: "New York", region: "America" },
    { id: "UTC", city: "UTC", region: "" },
  ])
})

test("search accepts city names, region paths, spaces, underscores, and mixed case", () => {
  for (const query of ["New York", "new_york", "AMERICA/NEW YORK", "  new   york  ", "America"]) {
    assert.equal(matchesZone("America/New_York", query), true)
  }
  assert.equal(matchesZone("America/New_York", "Tokyo"), false)
})

test("saved clocks retain their order and discard invalid or duplicate entries", () => {
  const available = new Set(["Europe/London", "Asia/Tokyo"])
  assert.deepEqual(
    savedClockIds(["Asia/Tokyo", null, "unknown", "Europe/London", "Asia/Tokyo"], available),
    ["Asia/Tokyo", "Europe/London"],
  )
  assert.throws(() => savedClockIds({ clocks: [] }, available))
})

test("day hints compare civil dates across month and year boundaries", () => {
  assert.equal(dayHint("2026-10-30", "2026-10-30"), "")
  assert.equal(dayHint("2026-11-01", "2026-10-31"), "Yesterday")
  assert.equal(dayHint("2026-12-31", "2027-01-01"), "Tomorrow")
  assert.equal(dayHint("2026-12-31", "2027-01-02"), "2 days ahead")
  assert.equal(dayHint("2027-01-02", "2026-12-31"), "2 days behind")
})

test("reordering places clocks before or after a target in either direction", () => {
  const ids = ["a", "b", "c", "d"]
  assert.deepEqual(reorderClocks(ids, "a", "c", false), ["b", "a", "c", "d"])
  assert.deepEqual(reorderClocks(ids, "a", "c", true), ["b", "c", "a", "d"])
  assert.deepEqual(reorderClocks(ids, "d", "b", false), ["a", "d", "b", "c"])
  assert.deepEqual(reorderClocks(ids, "d", "b", true), ["a", "b", "d", "c"])
  assert.deepEqual(ids, ["a", "b", "c", "d"])
})

test("reordering rejects missing clocks and preserves unchanged orders", () => {
  const ids = ["a", "b", "c"]
  assert.equal(reorderClocks(ids, "unknown", "a", false), null)
  assert.equal(reorderClocks(ids, "a", "unknown", false), null)
  assert.equal(reorderClocks(ids, "b", "b", false), ids)
  assert.equal(reorderClocks(ids, "b", "a", true), ids)
  assert.equal(reorderClocks(ids, "b", "c", false), ids)
})
