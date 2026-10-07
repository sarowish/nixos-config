{
  flake.modules.homeManager.cursor =
    { pkgs, ... }:
    let
      size = 16;
      themeName = "Bibata-Modern-Custom";
      cursorPackage = pkgs.callPackage ./_package.nix {
        inherit themeName;
        colors = {
          base = "#FF4FA3";
          outline = "#171923";
          watch = "#171923";
        };
      };
    in
    {
      home.pointerCursor = {
        package = cursorPackage;
        name = themeName;

        size = size;

        x11.enable = true;
        gtk.enable = true;
        hyprcursor = {
          enable = true;
          size = size;
        };

        dotIcons.enable = false;
      };
    };
}
