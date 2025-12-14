{
  config,
  pkgs,
  inputs,
  ...
}:
let
  accent = config.colors.accent;
in
{
  imports = [ inputs.niri.homeModules.niri ];

  home.packages = with pkgs; [
    xwayland-satellite
  ];

  programs.niri = {
    enable = true;
    package = inputs.niri-blurry.packages.${pkgs.system}.niri;

    settings = {
      # environment.NIXOS_OZONE_WL = "1";
      #
      # input = {
      #   focus-follows-mouse = {
      #     enable = true;
      #     max-scroll-amount = "0%";
      #   };
      #   workspace-auto-back-and-forth = true;
      # };
      #
      # outputs = {
      #   DP-1 = {
      #     enable = true;
      #     mode = {
      #       width = 2560;
      #       height = 1440;
      #       refresh = 165.;
      #     };
      #     scale = 1;
      #     position = {
      #       x = 0;
      #       y = 0;
      #     };
      #   };
      #   HDMI-A-1 = {
      #     enable = true;
      #     mode = {
      #       width = 1920;
      #       height = 1080;
      #       refresh = 60.;
      #     };
      #     scale = 1;
      #     position = {
      #       x = 2560;
      #       y = 360;
      #     };
      #   };
      # };
      #
      # cursor.size = 16;
      #
      # layout = {
      #   gaps = 16;
      #   preset-column-widths = [
      #     { proportion = 1. / 3.; }
      #     { proportion = 1. / 2.; }
      #     { proportion = 2. / 3.; }
      #   ];
      #   default-column-width.proportion = 1. / 2.;
      #   focus-ring = {
      #     width = 2;
      #     active.color = "#${accent}";
      #     inactive.color = "#505050";
      #   };
      #
      #
      # };
      #
      # hotkey-overlay.skip-at-startup = true;
      # prefer-no-csd = true;
      #
      # window-rules = [
      #   {
      #     geometry-corner-radius = {
      #       bottom-left = 8.;
      #       bottom-right = 8.;
      #       top-left = 8.;
      #       top-right = 8.;
      #     };
      #     draw-border-with-background = false;
      #     clip-to-geometry = true;
      #   }
      # ];
      #
      # workspaces."1" = { };
      # workspaces."2" = { };
      # workspaces."3" = { };
      # workspaces."4" = { };
      # workspaces."5" = { };
      # workspaces."6" = { };
      # workspaces."7" = { };
      # workspaces."8" = { };
      #
      # binds = with config.lib.niri.actions; {
      #   "Mod+Return".action = spawn "foot";
      #   "Mod+Shift+Return".action = spawn "alacritty";
      #   "Mod+Period".action = spawn "librewolf";
      #   "Mod+SemiColon".action = spawn "foot" "ytsub";
      #   "Mod+D".action = spawn "foot" "yazi";
      #   "Mod+H".action = spawn "euphonica";
      #   "Mod+Shift+H".action = spawn "foot" "pulsemixer";
      #
      #   "XF86AudioRaiseVolume".action = spawn "wpctl" "set-volume" "@DEFAULT_AUDIO_SINK@" "5%+";
      #   "XF86AudioLowerVolume".action = spawn "wpctl" "set-volume" "@DEFAULT_AUDIO_SINK@" "5%-";
      #   "XF86AudioMute".action = spawn "wpctl" "set-mute" "@DEFAULT_AUDIO_SINK@" "toggle";
      #   "XF86AudioPlay".action = spawn "playerctl" "play-pause";
      #   "XF86AudioStop".action = spawn "playerctl" "stop";
      #   "XF86AudioPrev".action = spawn "playerctl" "previous";
      #   "XF86AudioNext".action = spawn "playerctl" "next";
      #   "Mod+G".action = spawn "mpc" "toggle";
      #
      #   "Mod+O" = {
      #     action = toggle-overview;
      #     repeat = false;
      #   };
      #   "Mod+L" = {
      #     action = close-window;
      #     repeat = false;
      #   };
      #
      #   "Mod+C".action = focus-column-left;
      #   "Mod+S".action = focus-window-down;
      #   "Mod+N".action = focus-window-up;
      #   "Mod+T".action = focus-column-right;
      #
      #   "Mod+Shift+C".action = move-column-left;
      #   "Mod+Shift+S".action = move-window-down;
      #   "Mod+Shift+N".action = move-window-up;
      #   "Mod+Shift+T".action = move-column-right;
      #
      #   "Mod+Ctrl+C".action = focus-monitor-left;
      #   "Mod+Ctrl+T".action = focus-monitor-right;
      #
      #   "Mod+Shift+Ctrl+C".action = move-column-to-monitor-left;
      #   "Mod+Shift+Ctrl+T".action = move-column-to-monitor-right;
      #
      #   "Mod+BracketLeft".action = focus-workspace-up;
      #   "Mod+BracketRight".action = focus-workspace-down;
      #   "Mod+WheelScrollUp" = {
      #     action = focus-workspace-up;
      #     cooldown-ms = 150;
      #   };
      #   "Mod+WheelScrollDown" = {
      #     action = focus-workspace-down;
      #     cooldown-ms = 150;
      #   };
      #
      #   "Mod+Shift+BracketLeft".action = move-workspace-up;
      #   "Mod+Shift+BracketRight".action = move-workspace-down;
      #
      #   "Mod+Shift+WheelScrollUp".action = focus-column-right;
      #   "Mod+Shift+WheelScrollDown".action = focus-column-left;
      #
      #   "Mod+1".action = focus-workspace 1;
      #   "Mod+2".action = focus-workspace 2;
      #   "Mod+3".action = focus-workspace 3;
      #   "Mod+4".action = focus-workspace 4;
      #   "Mod+5".action = focus-workspace 5;
      #   "Mod+6".action = focus-workspace 6;
      #   "Mod+7".action = focus-workspace 7;
      #   "Mod+8".action = focus-workspace 8;
      #   "Mod+9".action = focus-workspace 9;
      #
      #   "Mod+Shift+1".action.move-window-to-workspace = 1;
      #   "Mod+Shift+2".action.move-window-to-workspace = 2;
      #   "Mod+Shift+3".action.move-window-to-workspace = 3;
      #   "Mod+Shift+4".action.move-window-to-workspace = 4;
      #   "Mod+Shift+5".action.move-window-to-workspace = 5;
      #   "Mod+Shift+6".action.move-window-to-workspace = 6;
      #   "Mod+Shift+7".action.move-window-to-workspace = 7;
      #   "Mod+Shift+8".action.move-window-to-workspace = 8;
      #   "Mod+Shift+9".action.move-window-to-workspace = 9;
      #
      #   "Mod+Ctrl+1".action.move-column-to-workspace = 1;
      #   "Mod+Ctrl+2".action.move-column-to-workspace = 2;
      #   "Mod+Ctrl+3".action.move-column-to-workspace = 3;
      #   "Mod+Ctrl+4".action.move-column-to-workspace = 4;
      #   "Mod+Ctrl+5".action.move-column-to-workspace = 5;
      #   "Mod+Ctrl+6".action.move-column-to-workspace = 6;
      #   "Mod+Ctrl+7".action.move-column-to-workspace = 7;
      #   "Mod+Ctrl+8".action.move-column-to-workspace = 8;
      #   "Mod+Ctrl+9".action.move-column-to-workspace = 9;
      #
      #   "Mod+P".action = consume-or-expel-window-left;
      #   "Mod+M".action = consume-or-expel-window-right;
      #   "Mod+B".action = consume-window-into-column;
      #   "Mod+K".action = expel-window-from-column;
      #
      #   "Mod+V".action = switch-preset-column-width;
      #   "Mod+Shift+V".action = switch-preset-window-height;
      #   "Mod+Ctrl+V".action = reset-window-height;
      #   "Mod+Shift+F".action = maximize-column;
      #   "Mod+F".action = fullscreen-window;
      #   "Mod+Ctrl+F".action = expand-column-to-available-width;
      #
      #   "Mod+Alt+C".action = set-column-width "-10%";
      #   "Mod+Alt+T".action = set-column-width "+10%";
      #
      #   "Mod+Alt+S".action = set-window-height "+10%";
      #   "Mod+Alt+N".action = set-window-height "-10%";
      #
      #   "Mod+R".action = toggle-window-floating;
      #   "Mod+Shift+R".action = switch-focus-between-floating-and-tiling;
      #
      #   "Mod+W".action = toggle-column-tabbed-display;
      #
      #   "Mod+Shift+E".action.screenshot = [ ];
      #   "Mod+Alt+E".action.screenshot-screen = {
      #     write-to-disk = false;
      #   };
      #   "Mod+E".action.screenshot-window = {
      #     write-to-disk = false;
      #   };
      #
      #   "Mod+Shift+P".action = power-off-monitors;
      #   "Mod+Alt+Q".action = quit;
      # };
    };

    config =
      let
        inherit (inputs.niri.lib.kdl)
          node
          plain
          leaf
          flag
          ;
      in
      [
        (plain "environment" (leaf "NIXOS_OZONE_WL" "1"))

        (plain "input" [
          (leaf "focus-follows-mouse" { max-scroll-amount = "0%"; })
          (leaf "workspace-auto-back-and-forth" true)
        ])

        (node "output" "DP-1" [
          (leaf "mode" "2560x1440@165")

          (leaf "position" {
            x = 0;
            y = 0;
          })

          (plain "hot-corners" (flag "top-left"))
        ])

        (node "output" "HDMI-A-1" [
          (leaf "mode" "1920x1080@60")

          (leaf "position" {
            x = 2560;
            y = 360;
          })

          (plain "hot-corners" (flag "top-right"))
        ])

        (plain "cursor" (leaf "xcursor-size" 16))

        (plain "layout" [
          (leaf "gaps" 16)

          (plain "preset-column-widths" [
            (leaf "proportion" (1. / 3.))
            (leaf "proportion" (1. / 2.))
            (leaf "proportion" (2. / 3.))
          ])

          (plain "default-column-width" (leaf "proportion" (1. / 2.)))

          (plain "focus-ring" [
            (leaf "width" 2)
            (leaf "active-color" "#${accent}")
            (leaf "inactive-color" "#505050")
          ])

          (plain "border" (flag "off"))

          (plain "blur" [
            (flag "on")
            (leaf "passes" 2)
            (leaf "radius" 6.0)
            (leaf "noise" 0.0)
          ])
        ])

        (plain "hotkey-overlay" (flag "skip-at-startup"))

        (flag "prefer-no-csd")

        (plain "window-rule" [
          (leaf "geometry-corner-radius" 8)
          (leaf "draw-border-with-background" false)
          (leaf "clip-to-geometry" true)
        ])

        (leaf "workspace" "1")
        (leaf "workspace" "2")
        (leaf "workspace" "3")
        (leaf "workspace" "4")
        (leaf "workspace" "5")
        (leaf "workspace" "6")
        (leaf "workspace" "7")
        (leaf "workspace" "8")

        (plain "binds" [
          (plain "Mod+Return" (leaf "spawn" "foot"))
          (plain "Mod+Shift+Return" (leaf "spawn" "alacritty"))
          (plain "Mod+Period" (leaf "spawn" "librewolf"))
          (plain "Mod+I" (
            leaf "spawn" [
              "rofi"
              "-show"
              "drun"
            ]
          ))
          (plain "Mod+SemiColon" (
            leaf "spawn" [
              "foot"
              "ytsub"
            ]
          ))
          (plain "Mod+D" (
            leaf "spawn" [
              "foot"
              "yazi"
            ]
          ))
          (plain "Mod+H" (leaf "spawn" [ "euphonica" ]))
          (plain "Mod+Shift+H" (
            leaf "spawn" [
              "foot"
              "pulsemixer"
            ]
          ))

          (plain "XF86AudioRaiseVolume" (
            leaf "spawn" [
              "wpctl"
              "set-volume"
              "@DEFAULT_AUDIO_SINK@"
              "5%+"
            ]
          ))
          (plain "XF86AudioLowerVolume" (
            leaf "spawn" [
              "wpctl"
              "set-volume"
              "@DEFAULT_AUDIO_SINK@"
              "5%-"
            ]
          ))
          (plain "XF86AudioMute" (
            leaf "spawn" [
              "wpctl"
              "set-mute"
              "@DEFAULT_AUDIO_SINK@"
              "toggle"
            ]
          ))
          (plain "Mod+X" (leaf "spawn" "cycle_sinks"))

          (plain "XF86AudioPlay" (
            leaf "spawn" [
              "playerctl"
              "play-pause"
            ]
          ))
          (plain "XF86AudioStop" (
            leaf "spawn" [
              "playerctl"
              "stop"
            ]
          ))
          (plain "XF86AudioPrev" (
            leaf "spawn" [
              "playerctl"
              "previous"
            ]
          ))
          (plain "XF86AudioNext" (
            leaf "spawn" [
              "playerctl"
              "next"
            ]
          ))
          (plain "Mod+G" (
            leaf "spawn" [
              "mpc"
              "toggle"
            ]
          ))

          (plain "Mod+Shift+Alt+I" (
            leaf "spawn" [
              "systemctl"
              "poweroff"
            ]
          ))
          (plain "Mod+Shift+Ctrl+I" (
            leaf "spawn" [
              "systemctl"
              "suspend"
            ]
          ))
          (plain "Mod+Shift+Alt+R" (
            leaf "spawn" [
              "systemctl"
              "reboot"
            ]
          ))

          (plain "Mod+Shift+E" (flag "screenshot"))
          (plain "Mod+Alt+E" (leaf "screenshot-screen" { write-to-disk = false; }))
          (plain "Mod+E" (leaf "screenshot-window" { write-to-disk = false; }))

          (node "Mod+O" { repeat = false; } (flag "toggle-overview"))
          (node "Mod+L" { repeat = false; } (flag "close-window"))

          (plain "Mod+C" (flag "focus-column-left"))
          (plain "Mod+S" (flag "focus-window-down"))
          (plain "Mod+N" (flag "focus-window-up"))
          (plain "Mod+T" (flag "focus-column-right"))

          (plain "Mod+Shift+C" (flag "move-column-left"))
          (plain "Mod+Shift+S" (flag "move-window-down"))
          (plain "Mod+Shift+N" (flag "move-window-up"))
          (plain "Mod+Shift+T" (flag "move-column-right"))

          (plain "Mod+Ctrl+C" (flag "focus-monitor-left"))
          (plain "Mod+Ctrl+T" (flag "focus-monitor-right"))

          (plain "Mod+Shift+Ctrl+C" (flag "move-column-to-monitor-left"))
          (plain "Mod+Shift+Ctrl+T" (flag "move-column-to-monitor-right"))

          (plain "Mod+BracketLeft" (flag "focus-workspace-up"))
          (plain "Mod+BracketRight" (flag "focus-workspace-down"))
          (node "Mod+WheelScrollUp" { cooldown-ms = 150; } (flag "focus-workspace-up"))
          (node "Mod+WheelScrollDown" { cooldown-ms = 150; } (flag "focus-workspace-down"))

          (plain "Mod+Shift+BracketLeft" (flag "move-workspace-up"))
          (plain "Mod+Shift+BracketRight" (flag "move-workspace-down"))

          (plain "Mod+Shift+WheelScrollUp" (flag "focus-column-right"))
          (plain "Mod+Shift+WheelScrollDown" (flag "focus-column-left"))

          (plain "Mod+1" (leaf "focus-workspace" 1))
          (plain "Mod+2" (leaf "focus-workspace" 2))
          (plain "Mod+3" (leaf "focus-workspace" 3))
          (plain "Mod+4" (leaf "focus-workspace" 4))
          (plain "Mod+5" (leaf "focus-workspace" 5))
          (plain "Mod+6" (leaf "focus-workspace" 6))
          (plain "Mod+7" (leaf "focus-workspace" 7))
          (plain "Mod+8" (leaf "focus-workspace" 8))
          (plain "Mod+9" (leaf "focus-workspace" 9))

          (plain "Mod+Shift+1" (leaf "move-window-to-workspace" 1))
          (plain "Mod+Shift+2" (leaf "move-window-to-workspace" 2))
          (plain "Mod+Shift+3" (leaf "move-window-to-workspace" 3))
          (plain "Mod+Shift+4" (leaf "move-window-to-workspace" 4))
          (plain "Mod+Shift+5" (leaf "move-window-to-workspace" 5))
          (plain "Mod+Shift+6" (leaf "move-window-to-workspace" 6))
          (plain "Mod+Shift+7" (leaf "move-window-to-workspace" 7))
          (plain "Mod+Shift+8" (leaf "move-window-to-workspace" 8))
          (plain "Mod+Shift+9" (leaf "move-window-to-workspace" 9))

          (plain "Mod+Ctrl+1" (leaf "move-column-to-workspace" 1))
          (plain "Mod+Ctrl+2" (leaf "move-column-to-workspace" 2))
          (plain "Mod+Ctrl+3" (leaf "move-column-to-workspace" 3))
          (plain "Mod+Ctrl+4" (leaf "move-column-to-workspace" 4))
          (plain "Mod+Ctrl+5" (leaf "move-column-to-workspace" 5))
          (plain "Mod+Ctrl+6" (leaf "move-column-to-workspace" 6))
          (plain "Mod+Ctrl+7" (leaf "move-column-to-workspace" 7))
          (plain "Mod+Ctrl+8" (leaf "move-column-to-workspace" 8))
          (plain "Mod+Ctrl+9" (leaf "move-column-to-workspace" 9))

          (plain "Mod+P" (flag "consume-or-expel-window-left"))
          (plain "Mod+M" (flag "consume-or-expel-window-right"))
          (plain "Mod+B" (flag "consume-window-into-column"))
          (plain "Mod+K" (flag "expel-window-from-column"))

          (plain "Mod+R" (flag "switch-preset-column-width"))
          (plain "Mod+Shift+R" (flag "switch-preset-window-height"))
          (plain "Mod+Ctrl+R" (flag "reset-window-height"))
          (plain "Mod+Shift+F" (flag "maximize-column"))
          (plain "Mod+F" (flag "fullscreen-window"))
          (plain "Mod+Ctrl+F" (flag "expand-column-to-available-width"))

          (plain "Mod+Alt+C" (leaf "set-column-width" "-10%"))
          (plain "Mod+Alt+T" (leaf "set-column-width" "+10%"))

          (plain "Mod+Alt+S" (leaf "set-window-height" "+10%"))
          (plain "Mod+Alt+N" (leaf "set-window-height" "-10%"))

          (plain "Mod+U" (flag "toggle-window-floating"))
          (plain "Mod+Shift+U" (flag "switch-focus-between-floating-and-tiling"))

          (plain "Mod+W" (flag "toggle-column-tabbed-display"))

          (plain "Mod+Shift+P" (flag "power-off-monitors"))
          (plain "Mod+Alt+Q" (flag "quit"))
        ])
      ];
  };
}
