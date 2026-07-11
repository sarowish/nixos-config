{
  osConfig,
  config,
  inputs,
  lib,
  pkgs,
  ...
}:

let
  inherit (config.lib.file) mkOutOfStoreSymlink;
  hyprlandPackage = inputs.hyprland.packages.${pkgs.stdenv.hostPlatform.system}.hyprland;

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
    source = mkOutOfStoreSymlink "${config.home.homeDirectory}/nixos-config/home/hypr/config";
    recursive = true;
  };

  xdg.configFile."hypr/stubs".source = "${hyprlandPackage}/share/hypr/stubs";

  wayland.windowManager.hyprland = {
    enable = true;
    configType = "lua";
    xwayland.enable = true;
    package = hyprlandPackage;
    portalPackage =
      inputs.hyprland.packages.${pkgs.stdenv.hostPlatform.system}.xdg-desktop-portal-hyprland;

    extraConfig = ''
      package.path = package.path
        .. ";${config.xdg.configHome}/hypr/?.lua"
        .. ";${config.xdg.configHome}/hypr/?/init.lua"
        .. ";${inputs.split-monitor-workspaces}/lua/?.lua"
      _G.nix = ${lib.generators.toLua { } runtimeConfig}
      require("config")
    '';
  };
}
