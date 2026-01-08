{
  osConfig,
  config,
  inputs,
  pkgs,
  ...
}:

{
  home.packages = with pkgs; [
    hyprshot
    hyprpicker
    hyprsunset
    wl-clipboard
  ];

  services.hyprpaper = {
    enable = true;
    settings =
      let
        wallpaperFile = "${config.xdg.userDirs.pictures}/Wallpapers/GbkX938.png";
      in
      {
        wallpaper = {
          monitor = "";
          path = wallpaperFile;
        };
      };
  };

  wayland.windowManager.hyprland = {
    enable = true;
    xwayland.enable = true;
    package = inputs.hyprland.packages.${pkgs.stdenv.hostPlatform.system}.hyprland;
    portalPackage =
      inputs.hyprland.packages.${pkgs.stdenv.hostPlatform.system}.xdg-desktop-portal-hyprland;
    plugins = [
      inputs.split-monitor-workspaces.packages.${pkgs.stdenv.hostPlatform.system}.split-monitor-workspaces
    ];

    settings =
      let
        wpctl = "${pkgs.wireplumber}/bin/wpctl";
        pctl = "${pkgs.playerctl}/bin/playerctl";
        hyprshot = "${pkgs.hyprshot}/bin/hyprshot --clipboard-only";
        accent = config.colors.accent;
      in
      {
        monitor = [
          "DP-1, 2560x1440@165, 0x0, 1"
          "HDMI-A-1, 1920x1080@60, 2560x360, 1"
        ];

        env = [
          "NIXOS_OZONE_WL,1"
          "LIBVA_DRIVER_NAME,nvidia"
          "XDG_SESSION_TYPE,wayland"
          "GBM_BACKEND,nvidia-drm"
          "__GLX_VENDOR_LIBRARY_NAME,nvidia"
          "NVM_BACKEND,direct"
          "WLR_NO_HARDWARE_CURSORS,1"
        ];

        input = with osConfig.services.xserver; {
          kb_layout = xkb.layout;
          kb_options = xkb.options;

          follow_mouse = 1;
          sensitivity = 0;
        };

        general = {
          gaps_in = 4;
          gaps_out = 10;
          border_size = 1;
          "col.active_border" = "rgb(${accent})";
          "col.inactive_border" = "rgba(595959aa)";

          layout = "master";
          resize_on_border = true;
          hover_icon_on_border = false;
          no_focus_fallback = true;
        };

        binds = {
          workspace_back_and_forth = true;
          allow_workspace_cycles = true;
        };

        decoration = {
          rounding = 8;

          shadow = {
            range = 6;
            render_power = 3;
            color = "0xee${accent}";
            color_inactive = "0xee";
          };

          blur = {
            enabled = true;
            size = 6;
            passes = 2;
            new_optimizations = true;
            noise = 0;
          };
        };

        animations = {
          enabled = "yes";

          bezier = [
            "easeOutQuart,0.25,1,0.5,1"
            "easeOutQuint,0.22,1,0.36,1"
            "linear,0,0,1,1"
            "almostLinear,0.5,0.5,0.75,1.0"
          ];

          animation = [
            "global, 0"
            "windows, 1, 3.0, easeOutQuint"
            "windowsIn, 1, 3.0, easeOutQuint, popin 85%"
            "windowsOut, 1, 3.0, linear, popin 85%"
            "fadeShadow, 1, 5, easeOutQuart"
            "border, 1, 5, easeOutQuart"

            "fadeIn, 1, 1.4, almostLinear"
            "fadeOut, 1, 1.0, almostLinear"
            "layers, 1, 3.81, easeOutQuint"
            "layersIn, 1, 4, easeOutQuint, fade"
            "layersOut, 1, 1.5, linear, fade"
            "fadeLayersIn, 1, 1.5, almostLinear"
            "fadeLayersOut, 1, 1.2, almostLinear"

            "workspaces, 1, 2.5, easeOutQuart, slidefade 20%"
          ];
        };

        master = {
          new_status = "master";
          new_on_top = true;
          orientation = "right";
        };

        cursor.no_hardware_cursors = true;

        misc = {
          on_focus_under_fullscreen = 2;
          middle_click_paste = false;
        };

        plugin.split-monitor-workspaces = {
          count = 9;
          keep_focused = 1;
        };

        layerrule = [
          "match:namespace rofi, blur on"
          "match:namespace selection, no_anim on"
          "match:namespace notifications, blur on"
        ];

        windowrule = "match:class steam, workspace 7 silent";
        workspace = "m[1], layoutopt:orientation:left";

        bind = [
          "SUPER, return, exec, foot"
          "SUPER SHIFT, return, exec, alacritty"
          "SUPER, l, killactive"
          "SUPER ALT, q, exit"
          "SUPER, r, togglefloating"
          "SUPER SHIFT, r, pin"
          "SUPER, f, fullscreen"
          "SUPER, i, exec, rofi -show drun"
          "SUPER, period, exec, librewolf"
          "SUPER, semicolon, exec, foot ytsub"
          "SUPER, h, exec, ${pkgs.euphonica}/bin/euphonica"
          "SUPER SHIFT, h, exec, foot ${pkgs.pulsemixer}/bin/pulsemixer"
          "SUPER, d, exec, foot yazi"

          "SUPER SHIFT ALT, i, exec, systemctl poweroff"
          "SUPER SHIFT CONTROL, i, exec, systemctl suspend"
          "SUPER SHIFT ALT, r, exec, systemctl reboot"

          "SUPER, e, exec, ${hyprshot} -m window"
          "SUPER SHIFT, e, exec, ${hyprshot} -m region"
          "SUPER ALT, e, exec, ${hyprshot} -m output -m active"
          "SUPER, w, exec, killall -SIGUSR1 .waybar-wrapped"

          "SUPER, p, exec, mpc toggle"

          "SUPER, space, layoutmsg, swapwithmaster master"
          "SUPER SHIFT ALT, t, layoutmsg, addmaster master"
          "SUPER SHIFT ALT, c, layoutmsg, removemaster master"

          "SUPER CTRL, c, focusmonitor, DP-1"
          "SUPER CTRL, t, focusmonitor, HDMI-A-1"

          "SUPER, n, layoutmsg, cycleprev master"
          "SUPER, s, layoutmsg, cyclenext master"

          "SUPER, c, movefocus, l"
          "SUPER, t, movefocus, r"

          "SUPER SHIFT, c, movewindow, l"
          "SUPER SHIFT, t, movewindow, r"
          "SUPER SHIFT, n, movewindow, u"
          "SUPER SHIFT, s, movewindow, d"

          "SUPER, 1, split-workspace, 1"
          "SUPER, 2, split-workspace, 2"
          "SUPER, 3, split-workspace, 3"
          "SUPER, 4, split-workspace, 4"
          "SUPER, 5, split-workspace, 5"
          "SUPER, 6, split-workspace, 6"
          "SUPER, 7, split-workspace, 7"
          "SUPER, 8, split-workspace, 8"
          "SUPER, 9, split-workspace, 9"

          "SUPER, bracketleft, workspace, m-1"
          "SUPER, bracketright, workspace, m+1"
          "SUPER, tab, workspace, previous_per_monitor"

          "SUPER SHIFT, 1, split-movetoworkspacesilent, 1"
          "SUPER SHIFT, 2, split-movetoworkspacesilent, 2"
          "SUPER SHIFT, 3, split-movetoworkspacesilent, 3"
          "SUPER SHIFT, 4, split-movetoworkspacesilent, 4"
          "SUPER SHIFT, 5, split-movetoworkspacesilent, 5"
          "SUPER SHIFT, 6, split-movetoworkspacesilent, 6"
          "SUPER SHIFT, 7, split-movetoworkspacesilent, 7"
          "SUPER SHIFT, 8, split-movetoworkspacesilent, 8"
          "SUPER SHIFT, 9, split-movetoworkspacesilent, 9"

          "SUPER, o, exec, cycle_sinks"
          ", XF86AudioPlay, exec, ${pctl} play-pause"
          ", XF86AudioNext, exec, ${pctl} next"
          ", XF86AudioPrev, exec, ${pctl} previous"
          ", XF86AudioMute, exec, ${wpctl} set-mute @DEFAULT_AUDIO_SINK@ toggle"
        ];

        binde = [
          ", XF86AudioRaiseVolume, exec, ${wpctl} set-volume @DEFAULT_AUDIO_SINK@ 5%+"
          ", XF86AudioLowerVolume, exec, ${wpctl} set-volume @DEFAULT_AUDIO_SINK@ 5%-"

          "SUPER ALT, c, resizeactive, -10 0"
          "SUPER ALT, t, resizeactive, 10 0"
          "SUPER ALT, n, resizeactive, 0 -10"
          "SUPER ALT, s, resizeactive, 0 10"
        ];

        bindm = [
          "SUPER, mouse:272, movewindow"
          "SUPER, mouse:273, resizewindow"
        ];
      };
  };
}
