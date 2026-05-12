{ pkgs, ... }:
{
  home.packages = with pkgs; [
    xdg-utils
  ];

  xdg = {
    enable = true;
    mime.enable = true;

    mimeApps = {
      enable = true;
      defaultApplications = {
        "default-web-browser" = [ "librewolf.desktop" ];
        "text/html" = [ "librewolf.desktop" ];
        "x-scheme-handler/http" = [ "librewolf.desktop" ];
        "x-scheme-handler/https" = [ "librewolf.desktop" ];
        "x-scheme-handler/about" = [ "librewolf.desktop" ];
        "x-scheme-handler/unknown" = [ "librewolf.desktop" ];
      };
    };

    portal = {
      enable = true;
      extraPortals = with pkgs; [ xdg-desktop-portal-gtk ];
      config.common."org.freedesktop.impl.portal.FileChooser" = [ "gtk" ];
      config.niri.default = [
        "gtk"
        "gnome"
      ];
    };

    userDirs = {
      enable = true;
      createDirectories = true;
    };
  };
}
