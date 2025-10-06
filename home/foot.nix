{ config, ... }:
{
  programs.foot = {
    enable = true;
    settings = {
      main = {
        font = "Cascadia Code:pixelsize=14:antialias=true:autohint=true";
        pad = "2x2";
        underline-offset = 2;
      };

      colors = with config.colors; {
        alpha = 0.9;
        background = background;
        foreground = foreground;

        regular0 = black;
        regular1 = red;
        regular2 = green;
        regular3 = yellow;
        regular4 = blue;
        regular5 = magenta;
        regular6 = cyan;
        regular7 = white;

        bright0 = bright.black;
        bright1 = bright.red;
        bright2 = bright.green;
        bright3 = bright.yellow;
        bright4 = bright.blue;
        bright5 = bright.magenta;
        bright6 = bright.cyan;
        bright7 = bright.white;
      };

      cursor.style = "beam";

      key-bindings = {
        spawn-terminal = "Shift+Return";
      };
    };
  };
}
