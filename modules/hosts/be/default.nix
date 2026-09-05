{ config, ... }:

let
  inherit (config.flake.modules) homeManager nixos;
in
{
  flake.modules.nixos.be = {
    imports = [
      ./_hardware-configuration.nix
      nixos.boot
      nixos.byedpi
      nixos.documentation
      nixos.fonts
      nixos.greetd
      nixos.hyprland
      nixos.keyboard
      nixos.nix
      nixos.nvidia
      nixos.openrazer
      nixos.openrgb
      nixos.packages
      nixos.pipewire
      nixos.steam
      nixos.sudo
      nixos.user-chels
      nixos.virtualisation
      nixos.zram
    ];

    home-manager.users.chels.imports = [
      homeManager.chels
      homeManager.ags
      homeManager.alacritty
      homeManager.atuin
      homeManager.awww
      homeManager.bawa
      homeManager.beets
      homeManager.btop
      homeManager.byedpi
      homeManager.codex
      homeManager.colors
      homeManager.cursor
      homeManager.fish
      homeManager.foot
      homeManager.git
      homeManager.gtk
      homeManager.helium
      homeManager.hyfetch
      homeManager.hyprland
      homeManager.imv
      homeManager.jujutsu
      homeManager.librewolf
      homeManager.mako
      homeManager.mpd
      homeManager.mpv
      homeManager.neovim
      homeManager.niri
      homeManager.obs-studio
      homeManager.openrgb
      homeManager.rmpc
      homeManager.rofi
      homeManager.shell
      homeManager.tealdeer
      homeManager.vesktop
      homeManager.xdg
      homeManager.yazi
      homeManager.ytsub
      homeManager.zathura
    ];

    time.timeZone = "Europe/Istanbul";
    system.stateVersion = "25.05";
  };
}
