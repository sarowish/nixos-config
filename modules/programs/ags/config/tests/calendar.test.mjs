import assert from "node:assert/strict"
import test from "node:test"
import { monthDates } from "../calendar/dates.ts"

test("the calendar fills six Monday-first weeks, including neighboring months", () => {
  const dates = monthDates(2026, 9)
  assert.equal(dates.length, 42)
  assert.equal(dates[0].toISOString().slice(0, 10), "2026-09-28")
  assert.equal(dates.at(-1).toISOString().slice(0, 10), "2026-11-08")
  assert.equal(dates[0].getUTCDay(), 1)
  assert.equal(dates.at(-1).getUTCDay(), 0)
})

test("months beginning on Monday or Sunday keep the same six-week height", () => {
  for (const [year, month, first, last] of [
    [2021, 1, "2021-02-01", "2021-03-14"],
    [2026, 2, "2026-02-23", "2026-04-05"],
  ]) {
    const dates = monthDates(year, month)
    assert.equal(dates.length, 42)
    assert.equal(dates[0].toISOString().slice(0, 10), first)
    assert.equal(dates.at(-1).toISOString().slice(0, 10), last)
  }
})

test("February follows leap-year rules, including century years", () => {
  for (const [year, length] of [
    [2024, 29],
    [2025, 28],
    [1900, 28],
    [2000, 29],
  ]) {
    const february = monthDates(year, 1).filter((date) => date.getUTCMonth() === 1)
    assert.equal(february.length, length)
    assert.equal(february.at(-1).getUTCDate(), length)
  }
})

test("month navigation crosses year boundaries in both directions", () => {
  assert.deepEqual(
    monthDates(2026, -1).map((date) => date.toISOString()),
    monthDates(2025, 11).map((date) => date.toISOString()),
  )
  assert.deepEqual(
    monthDates(2026, 12).map((date) => date.toISOString()),
    monthDates(2027, 0).map((date) => date.toISOString()),
  )
})
