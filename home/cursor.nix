{ pkgs, ... }:
let
  size = 16;
in
{
  home.pointerCursor = {
    package = pkgs.bibata-cursors;
    name = "Bibata-Modern-Ice";

    size = size;

    x11.enable = true;
    gtk.enable = true;
    hyprcursor = {
      enable = true;
      size = size;
    };
  };
}
