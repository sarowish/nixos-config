import assert from "node:assert/strict"
import test from "node:test"
import {
  shiftShutdownTime,
  shutdownAfter,
  shutdownDeadline,
  shutdownRemaining,
  shutdownSchedule,
} from "../services/power-state.ts"

process.env.TZ = "UTC"
const now = Date.parse("2026-11-23T12:00:00Z")

test("logind shutdown timestamps convert from microseconds without losing their deadline", () => {
  assert.deepEqual(shutdownSchedule(["poweroff", 1795437000000000]), {
    type: "poweroff",
    when: 1795437000000,
  })
  for (const value of [
    undefined,
    ["", 0],
    ["poweroff", -1],
    ["poweroff", "1000"],
    ["poweroff", Infinity],
  ])
    assert.equal(shutdownSchedule(value), null)
})

test("custom shutdowns accept future local times and reject past or rolled-over dates", () => {
  assert.equal(shutdownDeadline("2026-11-23", "12:30", now), Date.parse("2026-11-23T12:30:00Z"))
  assert.equal(shutdownDeadline("2026-11-24", "01:00", now), Date.parse("2026-11-24T01:00:00Z"))
  for (const [date, time] of [
    ["2026-11-23", "12:00"],
    ["2026-11-22", "23:59"],
    ["2026-02-30", "14:00"],
    ["2026-11-23", "24:00"],
    ["2026-11-23", "12:60"],
    ["", "12:30"],
  ])
    assert.throws(() => shutdownDeadline(date, time, now))
})

test("duration entry accepts arbitrary whole minutes and crosses midnight without clock-time parsing", () => {
  assert.equal(shutdownAfter("88", now), Date.parse("2026-11-23T13:28:00Z"))
  assert.equal(shutdownAfter(" 095 ", now), Date.parse("2026-11-23T13:35:00Z"))
  assert.equal(
    shutdownAfter("95", Date.parse("2026-11-23T23:30:00Z")),
    Date.parse("2026-11-24T01:05:00Z"),
  )
})

test("invalid or excessive durations cannot reach logind as immediate or imprecise shutdowns", () => {
  for (const value of [
    "",
    " ",
    "0",
    "-5",
    "0.5",
    "88min",
    "1e3",
    "Infinity",
    "9007199254740992",
    "999999999999",
  ])
    assert.throws(() => shutdownAfter(value, now))
})

test("clock adjustments carry the local date across midnight and year boundaries", () => {
  assert.deepEqual(shiftShutdownTime("2026-11-23", "23:58", 5), {
    date: "2026-11-24",
    time: "00:03",
  })
  assert.deepEqual(shiftShutdownTime("2026-01-01", "00:02", -5), {
    date: "2025-12-31",
    time: "23:57",
  })
  assert.deepEqual(shiftShutdownTime("2026-12-31", "23:59", 1), {
    date: "2027-01-01",
    time: "00:00",
  })
  assert.throws(() => shiftShutdownTime("2026-11-23", "", 5), /Enter a date/)
})

test("nonexistent times in a daylight-saving gap cannot silently schedule an hour later", () => {
  process.env.TZ = "America/New_York"
  try {
    assert.throws(() => shutdownDeadline("2027-03-14", "02:30", now), /valid local/)
    assert.equal(shutdownDeadline("2027-03-14", "03:30", now), Date.parse("2027-03-14T07:30:00Z"))
    assert.deepEqual(shiftShutdownTime("2027-03-14", "01:58", 5), {
      date: "2027-03-14",
      time: "03:03",
    })
    assert.throws(() => shiftShutdownTime("2027-11-07", "01:58", 5))
  } finally {
    process.env.TZ = "UTC"
  }
})

test("the countdown rounds up until the deadline and never displays negative time", () => {
  assert.equal(shutdownRemaining(now + 1000, now), "1m remaining")
  assert.equal(shutdownRemaining(now + 3600000, now), "1h remaining")
  assert.equal(shutdownRemaining(now + 3660000, now), "1h 1m remaining")
  assert.equal(shutdownRemaining(now - 1000, now), "Shutdown is due")
})
