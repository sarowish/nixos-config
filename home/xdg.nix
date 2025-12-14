{ pkgs, ... }:
{
  home.packages = with pkgs; [
    xdg-utils
  ];

  xdg = {
    enable = true;
    mime.enable = true;

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
