{ pkgs, config, ... }:

let
  wpctl = "${pkgs.wireplumber}/bin/wpctl";
  accent = config.colors.accent;
in
{
  programs.waybar = {
    enable = true;
    systemd = {
      enable = true;
      target = "graphical-session.target";
    };
    settings.mainBar = {
      layer = "top";
      position = "bottom";
      height = 30;
      spacing = 8;
      margin-left = 8;
      margin-right = 8;
      modules-left = [
        "hyprland/workspaces"
        "niri/workspaces"
        "mpd"
      ];
      modules-center = [ "clock" ];
      modules-right = [
        "pulseaudio"
        "niri/language"
        "hyprland/language"
        "custom/memory"
        "cpu"
        "tray"
      ];
      "niri/workspaces" = {
        format = "{icon}";
        format-icons = {
          active = "";
          default = "";
          empty = "";
        };
      };
      "hyprland/workspaces" = {
        disable-scroll = true;
        persistent-workspaces = {
          "*" = 9;
        };
        all-outputs = false;
        on-scroll-up = "hyprctl dispatch workspace m+1";
        on-scroll-down = "hyprctl dispatch workspace m-1";
        on-click = "activate";
        format = "{icon}";
        format-icons = {
          urgent = "";
          active = "";
          default = "";
          empty = "";
        };
      };
      "hyprland/language" = {
        format = "<span color='#${accent}'>󰌌</span>  {}";
        format-en = "English";
        format-en-colemak_dh = "Colemak-DH";
        format-tr = "Turkish";
      };
      "niri/language" = {
        format = "<span color='#${accent}'>󰌌</span>  {}";
      };
      tray = {
        spacing = 10;
        show-passive-items = true;
      };
      clock = {
        tooltip-format = "<big>{:%Y %B}</big>\n<tt><small>{calendar}</small></tt>";
        interval = 1;
        format = "{:%e %B %A %H:%M:%S}";
        format-alt = "{:%Y-%m-%d}";
      };
      cpu = {
        format = "<span color='#${accent}'></span> {usage}%";
        tooltip = false;
      };
      "custom/memory" = {
        format = "<span color='#${accent}'></span> {} MiB";
        exec = "free -m | awk '/Mem:/{printf $3}'";
        interval = 3;
      };
      mpd = {
        format = "{artist} - {title}";
        format-stopped = "     ";
        tooltip-format = "{stateIcon}: {artist} - {title}  [{elapsedTime:%M:%S}/{totalTime:%M:%S}]";
        interval = 10;
        state-icons = {
          playing = "Playing";
          paused = "Paused";
        };
        title-len = 80;
        on-click = "mpc toggle";
        on-click-middle = "mpc next";
        on-click-right = "mpc cdprev";
      };
      pulseaudio = {
        scroll-step = 5;
        format = "<span color='#${accent}'>{icon}</span> {volume}%";
        format-muted = "󰖁 muted";
        format-icons = {
          default = [
            ""
            ""
            ""
          ];
        };
        max-volume = 150;
        on-click = "${wpctl} set-mute @DEFAULT_AUDIO_SINK@ toggle";
        on-click-right = "cycle_sinks";
      };
    };
    style = ''
      * {
        border: none;
        border-radius: 0;
        font-family: "Fira Sans Book", "Nerd Fonts";
        min-height: 0;
      }

      window#waybar {
        background: transparent;
        color: white;
      }

      #workspaces button {
        padding: 0 2px;
        background: transparent;
        color: white;
      }

      #workspaces button.active {
        color: #${accent};
      }

      #workspaces button:hover {
        text-shadow: inherit;
      }

      #tags button.occupied {
        color: #${accent};
      }

      #tags button.focused {
        color: #${accent};
      }

      #clock,
      #pulseaudio #language,
      #cpu,
      #memory {
        padding: 0 4px;
      }
    '';
  };
}
