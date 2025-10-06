{ pkgs, config, ... }:
{
  programs.rofi = {
    enable = true;

    font = "Fira Sans Book 12";
    extraConfig = {
      show-icons = false;
      hover-select = true;
    };

    theme =
      let
        inherit (config.lib.formats.rasi) mkLiteral;
      in
      {
        "*" = {
          foreground = mkLiteral "#d9e0ee";
          background = mkLiteral "rgba(51, 53, 58, 65%)";
          background-input = mkLiteral "rgba(127, 132, 155, 15%)";
          background-selected = mkLiteral "#${config.colors.accent}";
          selected = mkLiteral "#00ff00";
          background-alt = mkLiteral "#00ff00";
        };

        "window" = {
          transparency = "real";
          location = mkLiteral "center";
          anchor = mkLiteral "center";
          fullscreen = false;
          width = mkLiteral "25%";
          x-offset = 0;
          y-offset = 0;

          enabled = true;
          margin = 0;
          padding = 0;
          border = mkLiteral "0px solid";
          border-radius = 12;
          border-color = mkLiteral "@background";
          background-color = mkLiteral "@background";
          cursor = "default";
        };

        "mainbox" = {
          enabled = true;
          spacing = mkLiteral "2%";
          margin = 0;
          padding = mkLiteral "2% 1% 2% 1%";
          border = mkLiteral "0px solid";
          border-radius = 12;
          border-color = mkLiteral "@background";
          background-color = mkLiteral "transparent";
          child = map mkLiteral [
            "inputbar"
            "listview"
          ];
        };

        "inputbar" = {
          enabled = true;
          margin = 0;
          padding = 10;
          border = mkLiteral "0px solid";
          border-radius = 8;
          border-color = mkLiteral "@selected";
          background-color = mkLiteral "@background-input";
          text-color = mkLiteral "@foreground";
          child = map mkLiteral [
            "entry"
          ];
        };

        "prompt".enabled = false;
        "case-indicator".enabled = false;

        "textbox-prompt-colon" = {
          enabled = false;
          expand = false;
          str = "::";
          background-color = mkLiteral "transparent";
          text-color = mkLiteral "inherit";
        };

        "entry" = {
          enabled = true;
          placeholder = "Search";
          padding = mkLiteral "5px 1% 5px 10px";
          placeholder-color = mkLiteral "inherit";
          background-color = mkLiteral "transparent";
          text-color = mkLiteral "inherit";
          cursor = mkLiteral "text";
        };

        "listview" = {
          enabled = true;
          columns = 1;
          lines = 10;
          cycle = true;
          dynamic = true;
          scrollbar = false;
          layout = mkLiteral "vertical";
          reverse = false;
          fixed-height = true;
          fixed-columns = true;

          spacing = 6;
          margin = 0;
          padding = 0;
          border = mkLiteral "0px solid";
          border-radius = 12;
          border-color = mkLiteral "@selected";
          background-color = mkLiteral "@background-input";
          text-color = mkLiteral "@foreground";
          cursor = "default";
        };

        "scrollbar" = {
          handle-width = 5;
          handle-color = mkLiteral "@selected";
          border-radius = 0;
          background-color = mkLiteral "@background-alt";
        };

        "element" = {
          enabled = true;
          spacing = 0;
          margin = 0;
          padding = mkLiteral "1.2% 0% 1.2% 0%";
          border = mkLiteral "0px solid";
          border-radius = 8;
          border-color = mkLiteral "@selected";
          background-color = mkLiteral "transparent";
          text-color = mkLiteral "@foreground";
          cursor = mkLiteral "pointer";
        };

        "element selected" = {
          background-color = mkLiteral "@background-selected";
          text-color = mkLiteral "@foreground";
        };

        "element-icon" = {
          background-color = mkLiteral "transparent";
          text-color = mkLiteral "inherit";
          size = 32;
          cursor = mkLiteral "inherit";
        };

        "element-text" = {
          background-color = mkLiteral "transparent";
          text-color = mkLiteral "inherit";
          highlight = mkLiteral "inherit";
          cursor = mkLiteral "inherit";
          vertical-align = mkLiteral "0.5";
          horizontal-align = 0;
          margin = mkLiteral "0% 0.8% 0% 0.8%";
        };

        "element-text selected" = {
          text-color = mkLiteral "@background";
        };

        "error-message" = {
          padding = 15;
          border = mkLiteral "2 px solid";
          border-radius = 12;
          border-color = mkLiteral "@selected";
          background-color = mkLiteral "@background";
          text-color = mkLiteral "@foreground";
        };

        "textbox" = {
          background-color = mkLiteral "@background";
          text-color = mkLiteral "@foreground";
          vertical-align = mkLiteral "0.5";
          horizontal-align = 0;
          highlight = mkLiteral "none";
        };
      };
  };
}
