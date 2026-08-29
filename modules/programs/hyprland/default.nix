{ inputs, ... }:
{
  flake.modules.homeManager.hyprland =
    {
      osConfig,
      config,
      lib,
      pkgs,
      ...
    }:

    let
      inherit (config.lib.file) mkOutOfStoreSymlink;
      hyprlandPackages = inputs.hyprland.packages.${pkgs.stdenv.hostPlatform.system};
      hyprlandPackage = hyprlandPackages.hyprland;
      scrollOverview = inputs.scroll-overview.packages.${pkgs.stdenv.hostPlatform.system}.scrolloverview;

      runtimeConfig = {
        accent = config.colors.accent;
        keyboard = with osConfig.services.xserver.xkb; {
          inherit layout options;
        };
      };
    in
    {
      home.packages = with pkgs; [
        hyprshot
        hyprpicker
        hyprsunset
        wl-clipboard
      ];

      xdg.configFile."hypr/config" = {
        source = mkOutOfStoreSymlink "${config.home.homeDirectory}/nixos-config/modules/programs/hyprland/config";
        recursive = true;
      };

      xdg.configFile."hypr/stubs".source = "${hyprlandPackage}/share/hypr/stubs";

      wayland.windowManager.hyprland = {
        enable = false;
        configType = "lua";
        xwayland.enable = true;
        package = hyprlandPackage;
        portalPackage = hyprlandPackages.xdg-desktop-portal-hyprland;
        plugins = [
          "${scrollOverview}/lib/libscrolloverview.so"
        ];

        extraConfig = ''
          package.path = package.path
            .. ";${config.xdg.configHome}/hypr/?.lua"
            .. ";${config.xdg.configHome}/hypr/?/init.lua"
            .. ";${inputs.split-monitor-workspaces}/lua/?.lua"
          _G.nix = ${lib.generators.toLua { } runtimeConfig}
          require("config")
        '';
      };
    };

  flake.modules.nixos.hyprland =
    { pkgs, ... }:
    let
      hyprlandPackages = inputs.hyprland.packages.${pkgs.stdenv.hostPlatform.system};
    in
    {
      programs.hyprland = {
        enable = true;
        package = hyprlandPackages.hyprland;
        portalPackage = hyprlandPackages.xdg-desktop-portal-hyprland;
      };
    };
}
