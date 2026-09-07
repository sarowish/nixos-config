import assert from "node:assert/strict"
import test from "node:test"
import {
  activeWorkspaceOnOutput,
  emptyNiriState,
  updateNiri,
  windowColumnsOnOutput,
  workspacesOnOutput,
} from "../services/niri-state.ts"
import { cpuSample, cpuUsage, memoryUsed, mediaLabel } from "../services/parsers.ts"
import { fitWindowMap, interpolateRectangle, interpolateValue } from "../services/window-map.ts"

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

function tiledWindow(id, workspaceId, column, row, width = 960, height = 1080) {
  return {
    id,
    workspace_id: workspaceId,
    is_focused: false,
    is_floating: false,
    is_urgent: false,
    layout: {
      pos_in_scrolling_layout: [column, row],
      tile_size: [width, height],
    },
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

test("window events replace, focus, resize, mark urgent, and close windows", () => {
  const first = { ...tiledWindow(10, 2, 1, 1), is_focused: true }
  const second = tiledWindow(20, 2, 2, 1)
  let state = updateNiri(emptyNiriState, { WindowsChanged: { windows: [first, second] } })

  state = updateNiri(state, {
    WindowOpenedOrChanged: { window: { ...second, is_focused: true } },
  })
  assert.deepEqual(
    state.windows.map((item) => [item.id, item.is_focused]),
    [
      [10, false],
      [20, true],
    ],
  )

  const layout = { pos_in_scrolling_layout: [1, 1], tile_size: [720, 540] }
  state = updateNiri(state, { WindowLayoutsChanged: { changes: [[10, layout]] } })
  state = updateNiri(state, { WindowUrgencyChanged: { id: 10, urgent: true } })
  assert.deepEqual(state.windows[0].layout, layout)
  assert.equal(state.windows[0].is_urgent, true)

  state = updateNiri(state, { WindowFocusChanged: { id: null } })
  assert.equal(
    state.windows.some((item) => item.is_focused),
    false,
  )
  state = updateNiri(state, { WindowClosed: { id: 20 } })
  assert.deepEqual(
    state.windows.map((item) => item.id),
    [10],
  )
})

test("window columns contain only tiled windows on the output's active workspace", () => {
  const state = {
    ...emptyNiriState,
    workspaces: [workspace(2, "DP-1", 1, true), workspace(3, "DP-1", 2)],
    windows: [
      tiledWindow(30, 2, 2, 1),
      tiledWindow(20, 2, 1, 2),
      tiledWindow(10, 2, 1, 1),
      { ...tiledWindow(40, 2, 3, 1), is_floating: true },
      tiledWindow(50, 3, 1, 1),
    ],
  }

  assert.deepEqual(
    windowColumnsOnOutput(state, "DP-1").map((column) => column.map((item) => item.id)),
    [[10, 20], [30]],
  )
  assert.equal(activeWorkspaceOnOutput(state, "DP-1").id, 2)
  assert.deepEqual(windowColumnsOnOutput(state, "HDMI-A-1"), [])
  assert.equal(activeWorkspaceOnOutput(state, "HDMI-A-1"), undefined)
})

test("window map sizing preserves column height and window proportions", () => {
  const columns = [
    [tiledWindow(10, 2, 1, 1, 960, 700), tiledWindow(20, 2, 1, 2, 960, 300)],
    [tiledWindow(30, 2, 2, 1, 540, 1080)],
  ]
  const fitted = fitWindowMap(columns, 1080, 24)
  const firstColumn = fitted.tiles.filter((tile) => tile.x === 0)

  assert.equal(fitted.width, 34)
  assert.equal(firstColumn[0].width, 21)
  assert.equal(firstColumn.reduce((height, tile) => height + tile.height, 0) + 1, 24)
  assert.ok(firstColumn[0].height > firstColumn[1].height)
  assert.deepEqual(
    fitted.tiles.map(({ window, x, y, width, height }) => [window.id, x, y, width, height]),
    [
      [10, 0, 0, 21, 16],
      [20, 0, 17, 21, 7],
      [30, 22, 0, 12, 24],
    ],
  )
})

test("single-window columns preserve their height without overflowing the minimap", () => {
  const short = fitWindowMap([[tiledWindow(10, 2, 1, 1, 960, 540)]], 1080, 24)
  const tall = fitWindowMap([[tiledWindow(20, 2, 1, 1, 960, 2160)]], 1080, 24)

  assert.deepEqual(
    short.tiles.map(({ y, height }) => [y, height]),
    [[0, 12]],
  )
  assert.equal(tall.tiles[0].height, 24)
})

test("window map interpolation is bounded and can continue from an interrupted frame", () => {
  const start = { x: 0, y: 0, width: 2, height: 2 }
  const target = { x: 8, y: 16, width: 10, height: 18 }
  const midway = interpolateRectangle(start, target, 0.5)

  assert.deepEqual(interpolateRectangle(start, target, -1), start)
  assert.deepEqual(midway, { x: 7, y: 14, width: 9, height: 16 })
  assert.deepEqual(interpolateRectangle(start, target, 2), target)
  assert.deepEqual(interpolateRectangle(midway, start, 0), midway)
  assert.equal(interpolateValue(0, 1, 0.5), 0.875)
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
