def niri-action [apply: bool, action: record] {
    let request = ({Action: $action} | to json -r)
    if $apply {
        let reply = ($request | ^niri msg --json raw-request | from json)
        if $reply != "Handled" {
            error make {msg: $"Unexpected Niri reply: ($reply | to json -r)"}
        }
    } else {
        print $request
    }
}

def require-focused [id: int, workspace: int] {
    let win = (^niri msg --json focused-window | from json)
    if ($win.id? != $id) or ($win.workspace_id? != $workspace) {
        error make {msg: $"Window ($id) is no longer focused on workspace ($workspace)"}
    }
}

def main [--apply] {
    let active_workspaces = (^niri msg --json workspaces | from json
        | where {|ws| $ws.is_active and ($ws.output != null) })
    if ($active_workspaces | length) != 2 { return }

    let focused_workspace = ($active_workspaces | where is_focused | first)
    let other_workspace = ($active_workspaces | where {|ws| $ws.output != $focused_workspace.output } | first)
    let windows = (^niri msg --json windows | from json)

    for direction in [
        {source_id: $focused_workspace.id, destination_id: $other_workspace.id}
        {source_id: $other_workspace.id, destination_id: $focused_workspace.id}
    ] {
        let source_windows = ($windows | where workspace_id == $direction.source_id)
        let target = {Id: $direction.destination_id}
        let columns = ($source_windows | where {|win| $win.layout.pos_in_scrolling_layout != null }
            | each {|win| {window_id: $win.id, index: $win.layout.pos_in_scrolling_layout.0} }
            | uniq-by index | sort-by index)

        # The return pass sends columns back to a workspace we've already emptied.
        let destination_has_columns = ($direction.source_id == $focused_workspace.id and ($windows | any {|win|
            $win.workspace_id == $direction.destination_id and $win.layout.pos_in_scrolling_layout != null
        }))
        # Niri inserts after the active column. If the destination is empty,
        # move the leftmost column first so it becomes the insertion anchor.
        let move_order = if $destination_has_columns or ($columns | is-empty) {
            $columns | reverse
        } else {
            $columns | skip 1 | reverse | prepend ($columns | first)
        }

        for column in $move_order {
            niri-action $apply {FocusWindow: {id: $column.window_id}}
            if $apply { require-focused $column.window_id $direction.source_id }
            niri-action $apply {MoveColumnToWorkspace: {reference: $target, focus: false}}
        }
        for win in ($source_windows | where is_floating) {
            niri-action $apply {MoveWindowToWorkspace: {window_id: $win.id, reference: $target, focus: false}}
        }
    }

    if $focused_workspace.active_window_id != null {
        niri-action $apply {FocusWindow: {id: $focused_workspace.active_window_id}}
    } else {
        niri-action $apply {FocusMonitor: {output: $focused_workspace.output}}
    }
}
