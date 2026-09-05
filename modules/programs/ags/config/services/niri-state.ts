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

export interface NiriState {
  workspaces: Workspace[]
  keyboard: { names: string[]; current_idx: number }
}

export const emptyNiriState: NiriState = {
  workspaces: [],
  keyboard: { names: [], current_idx: 0 },
}

export type NiriEvent =
  | { WorkspacesChanged: { workspaces: Workspace[] } }
  | { WorkspaceActivated: { id: number; focused: boolean } }
  | { WorkspaceActiveWindowChanged: { workspace_id: number; active_window_id: number | null } }
  | { WorkspaceUrgencyChanged: { id: number; urgent: boolean } }
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
