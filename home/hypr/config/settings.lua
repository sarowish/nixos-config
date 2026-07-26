hl.monitor({
    output = "DP-1",
    mode = "2560x1440@165",
    position = "0x0",
    scale = 1,
})

hl.monitor({
    output = "HDMI-A-1",
    mode = "1920x1080@60",
    position = "2560x360",
    scale = 1,
})

local environment = {
    NIXOS_OZONE_WL = "1",
    LIBVA_DRIVER_NAME = "nvidia",
    XDG_SESSION_TYPE = "wayland",
    GBM_BACKEND = "nvidia-drm",
    __GLX_VENDOR_LIBRARY_NAME = "nvidia",
}

for name, value in pairs(environment) do
    hl.env(name, value)
end

hl.config({
    input = {
        kb_layout = nix.keyboard.layout,
        kb_options = nix.keyboard.options,
        follow_mouse = 1,
        sensitivity = 0,
    },

    general = {
        gaps_in = 4,
        gaps_out = 10,
        border_size = 1,
        col = {
            active_border = "rgb(" .. nix.accent .. ")",
            inactive_border = "rgba(595959aa)",
        },
        layout = "scrolling",
        resize_on_border = true,
        hover_icon_on_border = false,
        no_focus_fallback = true,
    },

    binds = {
        workspace_back_and_forth = true,
        allow_workspace_cycles = true,
        scroll_event_delay = 0,
    },

    decoration = {
        rounding = 8,
        shadow = {
            range = 3,
            render_power = 3,
            color = "rgba(" .. nix.accent .. "ee)",
            color_inactive = "rgba(000000ee)",
        },
        blur = {
            enabled = true,
            size = 6,
            passes = 2,
            new_optimizations = true,
            noise = 0,
        },
    },

    master = {
        new_status = "master",
        new_on_top = true,
        orientation = "right",
    },

    scrolling = {
        fullscreen_on_one_column = false,
        follow_min_visible = 1.0,
        explicit_column_widths = "0.33, 0.5, 1.0",
    },

    cursor = {
        no_hardware_cursors = true,
    },

    misc = {
        on_focus_under_fullscreen = 2,
        middle_click_paste = false,
    },
})

hl.curve("easeOutQuart", {
    type = "bezier",
    points = { { 0.25, 1 }, { 0.5, 1 } },
})
hl.curve("easeOutQuint", {
    type = "bezier",
    points = { { 0.22, 1 }, { 0.36, 1 } },
})
hl.curve("linear", {
    type = "bezier",
    points = { { 0, 0 }, { 1, 1 } },
})
hl.curve("almostLinear", {
    type = "bezier",
    points = { { 0.5, 0.5 }, { 0.75, 1 } },
})

local animations = {
    { leaf = "global",        enabled = false },
    { leaf = "windows",       enabled = true, speed = 3.0,  bezier = "easeOutQuint" },
    { leaf = "windowsIn",     enabled = true, speed = 3.0,  bezier = "easeOutQuint", style = "popin" },
    { leaf = "windowsOut",    enabled = true, speed = 3.0,  bezier = "linear",       style = "popin" },
    { leaf = "fadeShadow",    enabled = true, speed = 5,    bezier = "easeOutQuart" },
    { leaf = "border",        enabled = true, speed = 5,    bezier = "easeOutQuart" },
    { leaf = "fadeIn",        enabled = true, speed = 1.4,  bezier = "almostLinear" },
    { leaf = "fadeOut",       enabled = true, speed = 1.0,  bezier = "almostLinear" },
    { leaf = "layers",        enabled = true, speed = 3.81, bezier = "easeOutQuint" },
    { leaf = "layersIn",      enabled = true, speed = 4,    bezier = "easeOutQuint", style = "fade" },
    { leaf = "layersOut",     enabled = true, speed = 1.5,  bezier = "linear",       style = "fade" },
    { leaf = "fadeLayersIn",  enabled = true, speed = 1.5,  bezier = "almostLinear" },
    { leaf = "fadeLayersOut", enabled = true, speed = 1.2,  bezier = "almostLinear" },
    { leaf = "workspaces",    enabled = true, speed = 3.5,  bezier = "easeOutQuart", style = "slidevert" },
}

for _, animation in ipairs(animations) do
    hl.animation(animation)
end
