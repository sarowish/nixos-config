{
  config,
  pkgs,
  lib,
  inputs,
  ...
}:
let
  accent = config.colors.accent;
in
{
  imports = [ inputs.niri.homeModules.niri ];

  programs.niri =
    let
      niriPkgs = inputs.niri-pkgs.packages.${pkgs.stdenv.hostPlatform.system};
    in
    {
      enable = true;
      package = niriPkgs.niri-unstable;
      settings.xwayland-satellite.path = lib.getExe niriPkgs.xwayland-satellite-unstable;

      settings = {
        includes = lib.mkAfter [
          ./blur.kdl
        ];

        environment.NIXOS_OZONE_WL = "1";

        input = {
          focus-follows-mouse = {
            enable = true;
            max-scroll-amount = "0%";
          };
          workspace-auto-back-and-forth = true;
        };

        outputs = {
          DP-1 = {
            enable = true;
            mode = {
              width = 2560;
              height = 1440;
              refresh = 165.;
            };
            scale = 1;
            position = {
              x = 0;
              y = 0;
            };
            hot-corners = {
              bottom-left = false;
              bottom-right = false;
              top-left = true;
              top-right = false;
            };
          };
          HDMI-A-1 = {
            enable = true;
            mode = {
              width = 1920;
              height = 1080;
              refresh = 60.;
            };
            scale = 1;
            position = {
              x = 2560;
              y = 360;
            };
            hot-corners = {
              bottom-left = false;
              bottom-right = false;
              top-left = false;
              top-right = true;
            };
          };
        };

        cursor.size = 16;

        layout = {
          gaps = 16;
          preset-column-widths = [
            { proportion = 1. / 3.; }
            { proportion = 1. / 2.; }
            { proportion = 2. / 3.; }
          ];
          default-column-width.proportion = 1. / 2.;
          focus-ring = {
            width = 2;
            active.color = "#${accent}";
            inactive.color = "#505050";
          };
          border.enable = false;
        };

        hotkey-overlay.skip-at-startup = true;
        prefer-no-csd = true;

        window-rules = [
          {
            geometry-corner-radius = {
              bottom-left = 8.;
              bottom-right = 8.;
              top-left = 8.;
              top-right = 8.;
            };
            draw-border-with-background = false;
            clip-to-geometry = true;
          }
        ];

        workspaces."1" = { };
        workspaces."2" = { };
        workspaces."3" = { };
        workspaces."4" = { };
        workspaces."5" = { };
        workspaces."6" = { };
        workspaces."7" = { };
        workspaces."8" = { };

        binds = with config.lib.niri.actions; {
          "Mod+Return".action = spawn "foot";
          "Mod+Shift+Return".action = spawn "alacritty";
          "Mod+Period".action = spawn "librewolf";
          "Mod+I".action = spawn "vicinae" "toggle";
          "Mod+SemiColon".action = spawn "foot" "ytsub";
          "Mod+Shift+Z".action = spawn "foot" "bawa";
          "Mod+D".action = spawn "foot" "yazi";
          "Mod+H".action = spawn "euphonica";
          "Mod+Shift+H".action = spawn "foot" "pulsemixer";

          "XF86AudioRaiseVolume".action = spawn "wpctl" "set-volume" "@DEFAULT_AUDIO_SINK@" "5%+";
          "XF86AudioLowerVolume".action = spawn "wpctl" "set-volume" "@DEFAULT_AUDIO_SINK@" "5%-";
          "XF86AudioMute".action = spawn "wpctl" "set-mute" "@DEFAULT_AUDIO_SINK@" "toggle";
          "XF86AudioPlay".action = spawn "playerctl" "play-pause";
          "XF86AudioStop".action = spawn "playerctl" "stop";
          "XF86AudioPrev".action = spawn "playerctl" "previous";
          "XF86AudioNext".action = spawn "playerctl" "next";
          "Mod+G".action = spawn "mpc" "toggle";
          "Mod+z".action = spawn "bawa" "load";

          "Mod+Shift+Alt+I".action = spawn "systemctl" "poweroff";
          "Mod+Shift+Ctrl+I".action = spawn "systemctl" "suspend";
          "Mod+Shift+Alt+R".action = spawn "systemctl" "reboot";

          "Mod+Shift+E".action.screenshot = [ ];
          "Mod+Alt+E".action.screenshot-screen = {
            write-to-disk = false;
          };
          "Mod+E".action.screenshot-window = {
            write-to-disk = false;
          };

          "Mod+O" = {
            action = toggle-overview;
            repeat = false;
          };
          "Mod+L" = {
            action = close-window;
            repeat = false;
          };

          "Mod+Y".action = focus-column-first;
          "Mod+C".action = focus-column-left-or-last;
          "Mod+S".action = focus-window-or-workspace-down;
          "Mod+N".action = focus-window-or-workspace-up;
          "Mod+T".action = focus-column-right-or-first;
          "Mod+V".action = focus-column-last;

          "Mod+Shift+Y".action = move-column-to-first;
          "Mod+Shift+C".action = move-column-left;
          "Mod+Shift+S".action = move-window-down;
          "Mod+Shift+N".action = move-window-up;
          "Mod+Shift+T".action = move-column-right;
          "Mod+Shift+V".action = move-column-to-last;

          "Mod+Ctrl+C".action = focus-monitor-left;
          "Mod+Ctrl+T".action = focus-monitor-right;

          "Mod+Shift+Ctrl+C".action = move-column-to-monitor-left;
          "Mod+Shift+Ctrl+T".action = move-column-to-monitor-right;

          "Mod+Tab".action = focus-workspace-previous;
          "Mod+BracketLeft".action = focus-workspace-up;
          "Mod+BracketRight".action = focus-workspace-down;
          "Mod+WheelScrollUp" = {
            action = focus-workspace-up;
            cooldown-ms = 150;
          };
          "Mod+WheelScrollDown" = {
            action = focus-workspace-down;
            cooldown-ms = 150;
          };

          "Mod+Shift+BracketLeft".action = move-workspace-up;
          "Mod+Shift+BracketRight".action = move-workspace-down;

          "Mod+Shift+WheelScrollUp".action = focus-column-right-or-first;
          "Mod+Shift+WheelScrollDown".action = focus-column-left-or-last;

          "Mod+1".action = focus-workspace 1;
          "Mod+2".action = focus-workspace 2;
          "Mod+3".action = focus-workspace 3;
          "Mod+4".action = focus-workspace 4;
          "Mod+5".action = focus-workspace 5;
          "Mod+6".action = focus-workspace 6;
          "Mod+7".action = focus-workspace 7;
          "Mod+8".action = focus-workspace 8;
          "Mod+9".action = focus-workspace 9;

          "Mod+Shift+1".action.move-window-to-workspace = 1;
          "Mod+Shift+2".action.move-window-to-workspace = 2;
          "Mod+Shift+3".action.move-window-to-workspace = 3;
          "Mod+Shift+4".action.move-window-to-workspace = 4;
          "Mod+Shift+5".action.move-window-to-workspace = 5;
          "Mod+Shift+6".action.move-window-to-workspace = 6;
          "Mod+Shift+7".action.move-window-to-workspace = 7;
          "Mod+Shift+8".action.move-window-to-workspace = 8;
          "Mod+Shift+9".action.move-window-to-workspace = 9;

          "Mod+Ctrl+1".action.move-column-to-workspace = 1;
          "Mod+Ctrl+2".action.move-column-to-workspace = 2;
          "Mod+Ctrl+3".action.move-column-to-workspace = 3;
          "Mod+Ctrl+4".action.move-column-to-workspace = 4;
          "Mod+Ctrl+5".action.move-column-to-workspace = 5;
          "Mod+Ctrl+6".action.move-column-to-workspace = 6;
          "Mod+Ctrl+7".action.move-column-to-workspace = 7;
          "Mod+Ctrl+8".action.move-column-to-workspace = 8;
          "Mod+Ctrl+9".action.move-column-to-workspace = 9;

          "Mod+P".action = consume-or-expel-window-left;
          "Mod+M".action = consume-or-expel-window-right;
          "Mod+B".action = consume-window-into-column;
          "Mod+K".action = expel-window-from-column;

          "Mod+R".action = switch-preset-column-width;
          "Mod+Shift+R".action = switch-preset-window-height;
          "Mod+Ctrl+R".action = reset-window-height;
          "Mod+Ctrl+F".action = maximize-column;
          "Mod+Shift+F".action = fullscreen-window;
          "Mod+F".action = expand-column-to-available-width;

          "Mod+Alt+C".action = set-column-width "-5%";
          "Mod+Alt+T".action = set-column-width "+5%";

          "Mod+Alt+S".action = set-window-height "+5%";
          "Mod+Alt+N".action = set-window-height "-5%";

          "Mod+U".action = toggle-window-floating;
          "Mod+Shift+U".action = switch-focus-between-floating-and-tiling;

          "Mod+W".action = toggle-column-tabbed-display;

          "Mod+Shift+P".action = power-off-monitors;
          "Mod+Alt+Q".action = quit;
        };
      };
    };
}
