{ config, ... }:
{
  programs.alacritty = {
    enable = true;

    settings = {
      colors = with config.colors; {
        primary = {
          background = "#${background}";
          foreground = "#${foreground}";
        };

        normal = {
          black = "#${black}";
          blue = "#${blue}";
          cyan = "#${cyan}";
          green = "#${green}";
          magenta = "#${magenta}";
          red = "#${red}";
          white = "#${white}";
          yellow = "#${yellow}";
        };

        bright = with bright; {
          black = "#${black}";
          blue = "#${blue}";
          cyan = "#${cyan}";
          green = "#${green}";
          magenta = "#${magenta}";
          red = "#${red}";
          white = "#${white}";
          yellow = "#${yellow}";
        };

        selection = {
          background = "#45475a";
          text = "CellForeground";
        };
      };

      font = {
        normal.family = "Cascadia Code";
        size = 10.5;

        offset = {
          x = 0;
          y = 0;
        };
      };

      window = {
        opacity = 0.9;

        padding = {
          x = 2;
          y = 2;
        };
      };

      cursor.style = {
        shape = "Beam";
        blinking = "Off";
      };

      keyboard.bindings = [
        {
          key = "Enter";
          mods = "Shift";
          action = "SpawnNewInstance";
        }
      ];
    };
  };
}
