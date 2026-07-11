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
bind("SUPER + r", hl.dsp.window.float({ action = "toggle" }))
bind("SUPER + SHIFT + r", hl.dsp.window.pin({ action = "toggle" }))
bind("SUPER + f", hl.dsp.window.fullscreen({ action = "toggle" }))
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

exec("SUPER + p", "mpc toggle")
exec("SUPER + z", "bawa load")

bind("SUPER + space", hl.dsp.layout("swapwithmaster master"))
bind("SUPER + SHIFT + ALT + t", hl.dsp.layout("addmaster master"))
bind("SUPER + SHIFT + ALT + c", hl.dsp.layout("removemaster master"))

bind("SUPER + CTRL + c", hl.dsp.focus({ monitor = "DP-1" }))
bind("SUPER + CTRL + t", hl.dsp.focus({ monitor = "HDMI-A-1" }))

bind("SUPER + n", hl.dsp.layout("cycleprev master"))
bind("SUPER + s", hl.dsp.layout("cyclenext master"))

bind("SUPER + c", hl.dsp.focus({ direction = "left" }))
bind("SUPER + t", hl.dsp.focus({ direction = "right" }))

bind("SUPER + SHIFT + c", hl.dsp.window.move({ direction = "left" }))
bind("SUPER + SHIFT + t", hl.dsp.window.move({ direction = "right" }))
bind("SUPER + SHIFT + n", hl.dsp.window.move({ direction = "up" }))
bind("SUPER + SHIFT + s", hl.dsp.window.move({ direction = "down" }))

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

bind("SUPER + ALT + c", hl.dsp.window.resize({ x = -10, y = 0, relative = true }), { repeating = true })
bind("SUPER + ALT + t", hl.dsp.window.resize({ x = 10, y = 0, relative = true }), { repeating = true })
bind("SUPER + ALT + n", hl.dsp.window.resize({ x = 0, y = -10, relative = true }), { repeating = true })
bind("SUPER + ALT + s", hl.dsp.window.resize({ x = 0, y = 10, relative = true }), { repeating = true })

bind("SUPER + mouse:272", hl.dsp.window.drag(), { mouse = true })
bind("SUPER + mouse:273", hl.dsp.window.resize(), { mouse = true })
