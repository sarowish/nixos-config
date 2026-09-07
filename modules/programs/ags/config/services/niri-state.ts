export interface Workspace {
  id: number
  idx: number
  name: string | null
  output: string | null
  is_active: boolean
  is_focused: boolean
  is_urgent: boolean
  active_window_id: number | null
}

export interface NiriWindowLayout {
  pos_in_scrolling_layout: [number, number] | null
  tile_size: [number, number]
}

export interface NiriWindow {
  id: number
  workspace_id: number | null
  is_focused: boolean
  is_floating: boolean
  is_urgent: boolean
  layout: NiriWindowLayout
}

export interface NiriState {
  workspaces: Workspace[]
  windows: NiriWindow[]
  keyboard: { names: string[]; current_idx: number }
}

export const emptyNiriState: NiriState = {
  workspaces: [],
  windows: [],
  keyboard: { names: [], current_idx: 0 },
}

export type NiriEvent =
  | { WorkspacesChanged: { workspaces: Workspace[] } }
  | { WorkspaceActivated: { id: number; focused: boolean } }
  | { WorkspaceActiveWindowChanged: { workspace_id: number; active_window_id: number | null } }
  | { WorkspaceUrgencyChanged: { id: number; urgent: boolean } }
  | { WindowsChanged: { windows: NiriWindow[] } }
  | { WindowOpenedOrChanged: { window: NiriWindow } }
  | { WindowClosed: { id: number } }
  | { WindowFocusChanged: { id: number | null } }
  | { WindowLayoutsChanged: { changes: [number, NiriWindowLayout][] } }
  | { WindowUrgencyChanged: { id: number; urgent: boolean } }
  | { KeyboardLayoutsChanged: { keyboard_layouts: NiriState["keyboard"] } }
  | { KeyboardLayoutSwitched: { idx: number } }

// Unknown events are deliberately ignored; Niri adds new event variants over time.
export function updateNiri(state: NiriState, event: NiriEvent): NiriState {
  if ("WorkspacesChanged" in event)
    return { ...state, workspaces: event.WorkspacesChanged.workspaces }

  if ("WorkspaceActivated" in event) {
    const { id, focused } = event.WorkspaceActivated
    const activated = state.workspaces.find((workspace) => workspace.id === id)
    if (!activated) return state
    return {
      ...state,
      workspaces: state.workspaces.map((workspace) => ({
        ...workspace,
        is_active:
          workspace.output === activated.output ? workspace.id === id : workspace.is_active,
        is_focused: focused ? workspace.id === id : workspace.is_focused,
      })),
    }
  }

  if ("WorkspaceActiveWindowChanged" in event) {
    const { workspace_id, active_window_id } = event.WorkspaceActiveWindowChanged
    return {
      ...state,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspace_id ? { ...workspace, active_window_id } : workspace,
      ),
    }
  }

  if ("WorkspaceUrgencyChanged" in event) {
    const { id, urgent } = event.WorkspaceUrgencyChanged
    return {
      ...state,
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === id ? { ...workspace, is_urgent: urgent } : workspace,
      ),
    }
  }

  if ("WindowsChanged" in event) return { ...state, windows: event.WindowsChanged.windows }

  if ("WindowOpenedOrChanged" in event) {
    const window = event.WindowOpenedOrChanged.window
    const exists = state.windows.some((current) => current.id === window.id)
    const windows = state.windows.map((current) => {
      if (current.id === window.id) return window
      if (window.is_focused && current.is_focused) return { ...current, is_focused: false }
      return current
    })
    return { ...state, windows: exists ? windows : [...windows, window] }
  }

  if ("WindowClosed" in event)
    return {
      ...state,
      windows: state.windows.filter((window) => window.id !== event.WindowClosed.id),
    }

  if ("WindowFocusChanged" in event) {
    const focused = event.WindowFocusChanged.id
    return {
      ...state,
      windows: state.windows.map((window) => {
        const is_focused = window.id === focused
        return window.is_focused === is_focused ? window : { ...window, is_focused }
      }),
    }
  }

  if ("WindowLayoutsChanged" in event) {
    const changes = new Map(event.WindowLayoutsChanged.changes)
    return {
      ...state,
      windows: state.windows.map((window) => {
        const layout = changes.get(window.id)
        return layout ? { ...window, layout } : window
      }),
    }
  }

  if ("WindowUrgencyChanged" in event) {
    const { id, urgent } = event.WindowUrgencyChanged
    return {
      ...state,
      windows: state.windows.map((window) =>
        window.id === id ? { ...window, is_urgent: urgent } : window,
      ),
    }
  }

  if ("KeyboardLayoutsChanged" in event)
    return { ...state, keyboard: event.KeyboardLayoutsChanged.keyboard_layouts }
  if ("KeyboardLayoutSwitched" in event)
    return {
      ...state,
      keyboard: { ...state.keyboard, current_idx: event.KeyboardLayoutSwitched.idx },
    }
  return state
}

export function workspacesOnOutput(state: NiriState, output: string) {
  return state.workspaces
    .filter((workspace) => workspace.output === output)
    .sort((a, b) => a.idx - b.idx)
}

export function activeWorkspaceOnOutput(state: NiriState, output: string) {
  return state.workspaces.find((workspace) => workspace.output === output && workspace.is_active)
}

export function windowColumnsOnOutput(state: NiriState, output: string) {
  const workspace = activeWorkspaceOnOutput(state, output)
  if (!workspace) return []

  const columns = new Map<number, NiriWindow[]>()
  for (const window of state.windows) {
    const position = window.layout.pos_in_scrolling_layout
    if (window.workspace_id !== workspace.id || window.is_floating || !position) continue
    const [column] = position
    columns.set(column, [...(columns.get(column) ?? []), window])
  }

  return [...columns.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, windows]) =>
      windows.sort(
        (left, right) =>
          left.layout.pos_in_scrolling_layout![1] - right.layout.pos_in_scrolling_layout![1],
      ),
    )
}
