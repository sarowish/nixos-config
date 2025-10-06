{ config, ... }:
{
  programs.zathura = {
    enable = true;
    options = with config.colors; {
      statusbar-h-padding = 0;
      statusbar-v-padding = 0;
      page-padding = 1;

      font = "Fira Sans";
      guioptions = "v";

      recolor = true;
      recolor-keephue = true;

      default-fg = "#${foreground}";
      default-bg = "rgba(30,30,46,0.90)";
      completion-bg = "#313244";
      completion-fg = "#CDD6F4";
      completion-highlight-bg = "#575268";
      completion-highlight-fg = "#CDD6F4";
      completion-group-bg = "#313244";
      completion-group-fg = "#89B4FA";

      statusbar-fg = "#CDD6F4";
      statusbar-bg = "#313244";

      notification-bg = "#313244";
      notification-fg = "#CDD6F4";
      notification-error-bg = "#313244";
      notification-error-fg = "#F38BA8";
      notification-warning-bg = "#313244";
      notification-warning-fg = "#FAE3B0";

      inputbar-fg = "#CDD6F4";
      inputbar-bg = "#313244";

      recolor-lightcolor = "rgba(0,0,0,0)";
      recolor-darkcolor = "#CDD6F4";

      index-fg = "#CDD6F4";
      index-bg = "#1E1E2E";
      index-active-fg = "#CDD6F4";
      index-active-bg = "#313244";

      render-loading-bg = "#1E1E2E";
      render-loading-fg = "#CDD6F4";

      highlight-color = "rgba(87,82,104, 0.5)";
      highlight-fg = "rgba(245,194,231,0.5)";
      highlight-active-color = "rgba(245,194,231,0.5)";
    };

    mappings = {
      "<Button8>" = "navigate previous";
      "<Button9>" = "navigate next";
    };
  };
}
