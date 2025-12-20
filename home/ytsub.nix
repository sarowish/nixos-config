{ inputs, pkgs, ... }:
{
  programs.ytsub = {
    enable = true;
    package = inputs.ytsub.packages.${pkgs.stdenv.hostPlatform.system}.default;
    settings = {
      highlight_symbol = "|";
      tabs = [
        "videos"
        "streams"
      ];
      refresh_threshold = 0;
      subtitle_languages = [
        "en"
        "tr"
      ];

      focused = {
        fg = "Magenta";
        bg = "Black";
        modifiers = "bold";
      };

      error = {
        fg = "Red";
        modifiers = "italic";
      };
    };
  };
}
