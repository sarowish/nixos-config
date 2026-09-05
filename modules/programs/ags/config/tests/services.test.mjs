import assert from "node:assert/strict"
import test from "node:test"
import { emptyNiriState, updateNiri, workspacesOnOutput } from "../services/niri-state.ts"
import { cpuSample, cpuUsage, memoryUsed, mediaLabel } from "../services/parsers.ts"

function workspace(id, output, idx, active = false) {
  return {
    id,
    output,
    idx,
    name: null,
    is_active: active,
    is_focused: false,
    is_urgent: false,
    active_window_id: null,
  }
}

test("activation changes only its output, while keyboard focus is global", () => {
  const initial = {
    ...emptyNiriState,
    workspaces: [
      { ...workspace(8, "DP-1", 1, true), is_focused: true },
      workspace(20, "HDMI-A-1", 1, true),
      workspace(30, "HDMI-A-1", 2),
    ],
  }
  const activated = updateNiri(initial, { WorkspaceActivated: { id: 30, focused: false } })
  assert.deepEqual(
    activated.workspaces.filter((w) => w.is_active).map((w) => w.id),
    [8, 30],
  )
  assert.equal(activated.workspaces.find((w) => w.is_focused).id, 8)
  const focused = updateNiri(activated, { WorkspaceActivated: { id: 30, focused: true } })
  assert.deepEqual(
    focused.workspaces.filter((w) => w.is_focused).map((w) => w.id),
    [30],
  )
  assert.equal(initial.workspaces[1].is_active, true)
})

test("workspace replacement handles output moves, removals, and index ordering", () => {
  const state = updateNiri(emptyNiriState, {
    WorkspacesChanged: {
      workspaces: [workspace(2, "DP-1", 3), workspace(7, "DP-1", 1), workspace(3, "HDMI-A-1", 1)],
    },
  })
  assert.deepEqual(
    workspacesOnOutput(state, "DP-1").map((w) => w.id),
    [7, 2],
  )
  const replaced = updateNiri(state, {
    WorkspacesChanged: { workspaces: [workspace(7, "HDMI-A-1", 2)] },
  })
  assert.deepEqual(workspacesOnOutput(replaced, "DP-1"), [])
  assert.deepEqual(
    workspacesOnOutput(replaced, "HDMI-A-1").map((w) => w.id),
    [7],
  )
})

test("window and keyboard events update their state without losing other data", () => {
  let state = { ...emptyNiriState, workspaces: [workspace(2, "DP-1", 1)] }
  state = updateNiri(state, {
    WorkspaceActiveWindowChanged: { workspace_id: 2, active_window_id: 40 },
  })
  assert.equal(state.workspaces[0].active_window_id, 40)
  state = updateNiri(state, {
    WorkspaceActiveWindowChanged: { workspace_id: 2, active_window_id: null },
  })
  assert.equal(state.workspaces[0].active_window_id, null)
  state = updateNiri(state, {
    KeyboardLayoutsChanged: { keyboard_layouts: { names: ["Eria", "Turkish"], current_idx: 0 } },
  })
  state = updateNiri(state, { KeyboardLayoutSwitched: { idx: 1 } })
  assert.equal(state.keyboard.names[state.keyboard.current_idx], "Turkish")
  assert.equal(state.workspaces.length, 1)
  assert.equal(updateNiri(state, { FutureEvent: {} }), state)
  assert.equal(updateNiri(state, { WorkspaceActivated: { id: 999, focused: true } }), state)
})

test("MPD shows paused tracks, blanks stopped tracks, and limits only the title", () => {
  assert.equal(mediaLabel("artist\ttitle\n[paused] #1/3\nvolume:100%"), "artist - title")
  assert.equal(mediaLabel("artist\ttitle\nvolume:100%"), "     ")
  assert.equal(mediaLabel(""), "     ")
  assert.equal(mediaLabel(`artist\t${"🎵".repeat(81)}\n[playing]`), `artist - ${"🎵".repeat(80)}`)
})

test("CPU uses counter deltas, includes iowait as idle, and avoids guest double counting", () => {
  const previous = cpuSample("cpu 100 0 50 800 50 0 0 0 20 0\ncpu0 0 0 0")
  const current = cpuSample("cpu 140 0 70 920 70 10 10 0 40 0")
  assert.equal(previous.total, 1000)
  assert.equal(cpuUsage(previous, current), 36)
  assert.equal(cpuUsage(current, current), 0)
  assert.equal(cpuUsage(current, previous), 0)
})

test("memory matches free's used calculation and floors to MiB", () => {
  assert.equal(memoryUsed("MemTotal: 8192 kB\nMemFree: 128 kB\nMemAvailable: 3073 kB"), 4)
})
