{ inputs, config, ... }:

{
  imports = [
    inputs.sops-nix.homeManagerModules.sops
    ./alacritty.nix
    ./atuin.nix
    ./beets.nix
    ./btop.nix
    ./colors.nix
    ./cursor.nix
    ./fish.nix
    ./foot.nix
    ./git.nix
    ./gtk.nix
    ./hyfetch.nix
    ./hypr.nix
    ./imv.nix
    ./jujutsu.nix
    ./librewolf
    ./mako.nix
    ./mpd.nix
    ./mpv.nix
    ./neovim
    ./openrgb
    ./rofi.nix
    ./tealdeer.nix
    ./vesktop
    ./waybar.nix
    ./xdg.nix
    ./yazi.nix
    ./zathura.nix
  ];

  home.username = "chels";
  home.homeDirectory = "/home/chels";

  programs.bash.enable = true;
  programs.obs-studio.enable = true;

  programs.fd = {
    enable = true;
    hidden = true;
  };

  sops = {
    defaultSopsFile = ../secrets/secrets.yaml;
    defaultSopsFormat = "yaml";

    age.keyFile = "${config.xdg.configHome}/sops/age/keys.txt";

    secrets = {
      last_fm = { };
    };
  };

  programs.direnv.enable = true;

  home.stateVersion = "25.05";
}
