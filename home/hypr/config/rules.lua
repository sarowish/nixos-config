hl.layer_rule({
    name = "blur-rofi",
    match = { namespace = "rofi" },
    blur = true,
})

hl.layer_rule({
    name = "no-animation-selection",
    match = { namespace = "selection" },
    no_anim = true,
})

hl.layer_rule({
    name = "blur-notifications",
    match = { namespace = "notifications" },
    blur = true,
})

hl.window_rule({
    name = "steam-on-workspace-7",
    match = { class = "steam" },
    workspace = "7 silent",
})

hl.workspace_rule({
    workspace = "m[1]",
    layout_opts = { orientation = "left" },
})
