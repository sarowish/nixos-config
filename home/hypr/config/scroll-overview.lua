hl.config({
    plugin = {
        scrolloverview = {
            scale = 0.60,
            workspace_gap = 25,
            wallpaper = 2,
            blur = true,

            shadow = {
                enabled = true,
                range = 6,
                render_power = 3,
                color = "rgba(" .. nix.accent .. "ee)",
            },
        },
    },
})

local was_inside = false
local corner_size = 8

hl.timer(function()
    local cursor = hl.get_cursor_pos()
    local monitor = hl.get_monitor_at_cursor()
    if not cursor or not monitor then return end

    local inside =
        cursor.x >= monitor.x and
        cursor.x < monitor.x + corner_size and
        cursor.y >= monitor.y and
        cursor.y < monitor.y + corner_size

    if inside and not was_inside then
        local plugin = hl.plugin.scrolloverview
        if plugin and plugin.overview then
            hl.dispatch(plugin.overview("toggle"))
        end
    end

    was_inside = inside
end, {
    timeout = 127,
    type = "repeat",
})
