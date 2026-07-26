local smw = require("split-monitor-workspaces")

smw.setup({
    workspace_count = 9,
    keep_focused = true,
})

local function bind(keys, dispatcher, options)
    hl.bind(keys, dispatcher, options)
end

local function exec(keys, command, options)
    bind(keys, hl.dsp.exec_cmd(command), options)
end

exec("SUPER + return", "foot")
exec("SUPER + SHIFT + return", "alacritty")
bind("SUPER + l", hl.dsp.window.close())
bind("SUPER + ALT + q", hl.dsp.exit())
bind("SUPER + u", hl.dsp.window.float({ action = "toggle" }))
bind("SUPER + SHIFT + u", hl.dsp.window.pin({ action = "toggle" }))
bind("SUPER + f", hl.dsp.layout("fit expand"))
bind("SUPER + CTRL + f", hl.dsp.layout("fit active"))
bind("SUPER + SHIFT + f", hl.dsp.window.fullscreen({ action = "toggle" }))
exec("SUPER + i", "rofi -show drun")
exec("SUPER + period", "librewolf")
exec("SUPER + SHIFT + period", "helium")
exec("SUPER + semicolon", "foot ytsub")
exec("SUPER + SHIFT + z", "foot bawa")
exec("SUPER + h", "euphonica")
exec("SUPER + SHIFT + h", "foot pulsemixer")
exec("SUPER + d", "foot yazi")

exec("SUPER + SHIFT + ALT + i", "systemctl poweroff")
exec("SUPER + SHIFT + CONTROL + i", "systemctl suspend")
exec("SUPER + SHIFT + ALT + r", "systemctl reboot")

exec("SUPER + e", "hyprshot --clipboard-only -m window")
exec("SUPER + SHIFT + e", "hyprshot --clipboard-only -m region")
exec("SUPER + ALT + e", "hyprshot --clipboard-only -m output -m active")
exec("SUPER + w", "killall -SIGUSR1 .waybar-wrapped")

exec("SUPER + g", "mpc toggle")
exec("SUPER + z", "bawa load")

bind("SUPER + CTRL + c", hl.dsp.focus({ monitor = "left" }))
bind("SUPER + CTRL + t", hl.dsp.focus({ monitor = "right" }))

local function focus_window_or_workspace(direction, workspace)
    local window = hl.get_active_window()
    local layout = window and window.layout

    if layout and layout.name == "scrolling" and layout.column then
        local index = layout.index_in_column
        local last_index = #layout.column.windows - 1
        local has_window = direction == "up" and index > 0
            or direction == "down" and index < last_index

        if has_window then
            hl.dispatch(hl.dsp.layout("focus " .. direction))
            return
        end
    end

    hl.dispatch(hl.dsp.focus({ workspace = workspace }))
end

local function get_active_scrolling_context()
    local window = hl.get_active_window()
    local layout = window and window.layout

    if type(layout) ~= "table"
        or layout.name ~= "scrolling"
        or not layout.column
    then
        return nil
    end

    return {
        window = window,
        workspace = window and window.workspace,
        layout = layout,
        column = layout.column,
    }
end

local function get_edge_column(workspace, edge)
    if not workspace then return nil end

    local result

    for _, window in ipairs(hl.get_workspace_windows(workspace)) do
        local layout = window.layout

        if type(layout) == "table"
            and layout.name == "scrolling"
            and layout.column
        then
            local column = layout.column

            if not result
                or (edge == "first" and column.index < result.index)
                or (edge == "last" and column.index > result.index)
            then
                result = column
            end
        end
    end

    return result
end

local function focus_column_at_edge(edge)
    local context = get_active_scrolling_context()
    if not context then return end

    local column = get_edge_column(context.workspace, edge)
    if not column then return end

    local index = math.min(context.layout.index_in_column + 1, #column.windows)
    local target = column.windows[index]

    if target then
        hl.dispatch(hl.dsp.focus({ window = target }))
    end
end

local function move_column_to_edge(edge)
    local context = get_active_scrolling_context()
    if not context then return end

    local target = get_edge_column(context.workspace, edge)
    if not target then return end

    local delta = target.index - context.column.index
    local direction = delta < 0 and "l" or "r"

    for _ = 1, math.abs(delta) do
        hl.dispatch(hl.dsp.layout("swapcol " .. direction))
    end
end

local function move_column_to_monitor(direction)
    local ctx = get_active_scrolling_context()

    local column = ctx and ctx.column
    if not column then return end

    local monitor = hl.get_monitor(direction)
    if not monitor then return end

    hl.dispatch(hl.dsp.window.move({
        window = column.windows[1],
        monitor = monitor,
        follow = true,
    }))

    for index = 2, #column.windows do
        hl.dispatch(hl.dsp.window.move({
            window = column.windows[index],
            monitor = monitor,
            follow = false,
        }))

        hl.dispatch(hl.dsp.layout("consume"))
    end

    local active_window = ctx and ctx.window
    hl.dispatch(hl.dsp.focus({ window = active_window }))

    if direction == "right" then
        move_column_to_edge("first")
    end

    hl.dispatch(hl.dsp.layout("colresize " .. tostring(column.width)))
end

bind("SUPER + n", function() focus_window_or_workspace("up", "m-1") end)
bind("SUPER + s", function() focus_window_or_workspace("down", "m+1") end)
bind("SUPER + y", function() focus_column_at_edge("first") end)
bind("SUPER + c", hl.dsp.layout("focus left"))
bind("SUPER + t", hl.dsp.layout("focus right"))
bind("SUPER + v", function() focus_column_at_edge("last") end)

bind("SUPER + SHIFT + y", function() move_column_to_edge("first") end)
bind("SUPER + SHIFT + n", hl.dsp.window.move({ direction = "up" }))
bind("SUPER + SHIFT + s", hl.dsp.window.move({ direction = "down" }))
bind("SUPER + SHIFT + c", hl.dsp.layout("swapcol l"))
bind("SUPER + SHIFT + t", hl.dsp.layout("swapcol r"))
bind("SUPER + SHIFT + v", function() move_column_to_edge("last") end)

bind("SUPER + SHIFT + CTRL + c", function() move_column_to_monitor("left") end)
bind("SUPER + SHIFT + CTRL + t", function() move_column_to_monitor("right") end)

bind("SUPER + p", hl.dsp.layout("consume_or_expel prev"))
bind("SUPER + k", hl.dsp.layout("consume_or_expel next"))
bind("SUPER + m", hl.dsp.layout("consume"))
bind("SUPER + b", hl.dsp.layout("expel"))

for workspace = 1, smw.get_amount_of_workspaces() do
    local key = tostring(workspace)
    bind("SUPER + " .. key, smw.workspace(key))
    bind("SUPER + SHIFT + " .. key, smw.move_to_workspace_silent(key))
end

bind("SUPER + bracketleft", hl.dsp.focus({ workspace = "m-1" }))
bind("SUPER + bracketright", hl.dsp.focus({ workspace = "m+1" }))
bind("SUPER + Tab", hl.dsp.focus({ workspace = "previous_per_monitor" }))

exec("SUPER + o", "cycle_sinks")
exec("XF86AudioPlay", "playerctl play-pause", { locked = true })
exec("XF86AudioNext", "playerctl next", { locked = true })
exec("XF86AudioPrev", "playerctl previous", { locked = true })
exec("XF86AudioMute", "wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle", { locked = true })

exec(
    "XF86AudioRaiseVolume",
    "wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+",
    { repeating = true }
)
exec(
    "XF86AudioLowerVolume",
    "wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-",
    { repeating = true }
)


bind("SUPER + r", hl.dsp.layout("colresize +conf"))
bind("SUPER + SHIFT + r", hl.dsp.layout("colresize -conf"))

bind("SUPER + ALT + c", hl.dsp.layout("colresize -0.05"))
bind("SUPER + ALT + t", hl.dsp.layout("colresize +0.05"))
bind("SUPER + ALT + n", hl.dsp.window.resize({ x = 0, y = -20, relative = true }), { repeating = true })
bind("SUPER + ALT + s", hl.dsp.window.resize({ x = 0, y = 20, relative = true }), { repeating = true })

local double_right_click_pending = false
local double_right_click_generation = 0
local double_right_click_window

local function fit_on_double_right_click()
    local ctx = get_active_scrolling_context()
    if not ctx then return end

    local window = ctx.window
    if not window then return end

    double_right_click_generation = double_right_click_generation + 1
    local generation = double_right_click_generation

    if double_right_click_pending
        and window == double_right_click_window
    then
        double_right_click_pending = false
        double_right_click_window = nil

        if ctx.column.width == 1.0 then
            local default_width = hl.get_config("scrolling.column_width")
            hl.dispatch(hl.dsp.layout("colresize " .. default_width))
        else
            hl.dispatch(hl.dsp.layout("fit active"))
        end
        return
    end

    double_right_click_pending = true
    double_right_click_window = window

    hl.timer(function()
        if generation == double_right_click_generation then
            double_right_click_pending = false
            double_right_click_window = nil
        end
    end, {
        timeout = 300,
        type = "oneshot",
    })
end

bind("SUPER + mouse:272", hl.dsp.window.drag(), { mouse = true })
bind("SUPER + mouse:273", hl.dsp.window.resize(), { mouse = true })
bind("SUPER + mouse:275", hl.dsp.focus({ workspace = "m-1" }))
bind("SUPER + mouse:276", hl.dsp.focus({ workspace = "m+1" }))
bind("SUPER + mouse_down", hl.dsp.layout("focus left"))
bind("SUPER + mouse_up", hl.dsp.layout("focus right"))
bind("SUPER + mouse:273", fit_on_double_right_click, { click = true })
