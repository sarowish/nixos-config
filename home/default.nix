{
  inputs,
  pkgs,
  config,
  ...
}:

let
  t3code =
    inputs.nix-t3code.packages.${pkgs.stdenv.hostPlatform.system}.t3code.overrideAttrs
      (oldAttrs: {
        # Electron resolves the app entrypoint from package.json. nix-t3code 0.0.28
        # omitted it from the installed desktop directory.
        installPhase =
          builtins.replaceStrings
            [ "apps/desktop/{node_modules,dist-electron}" ]
            [ "apps/desktop/{package.json,node_modules,dist-electron}" ]
            oldAttrs.installPhase;
      });
in
{
  imports = [
    inputs.sops-nix.homeManagerModules.sops
    ../modules/programs/bawa.nix
    ../modules/programs/ytsub.nix
    ../modules/programs/mpd-herald.nix
    ./alacritty.nix
    ./atuin.nix
    ./awww.nix
    ./bawa.nix
    ./beets.nix
    ./btop.nix
    ./colors.nix
    ./cursor.nix
    ./fish.nix
    ./foot.nix
    ./git.nix
    ./gtk.nix
    ./helium.nix
    ./hyfetch.nix
    ./hypr.nix
    ./imv.nix
    ./jujutsu.nix
    ./librewolf
    ./mako.nix
    ./mpd.nix
    ./mpv.nix
    ./neovim
    ./niri
    ./openrgb
    ./rmpc.nix
    ./rofi.nix
    ./tealdeer.nix
    ./vesktop
    ./waybar.nix
    ./xdg.nix
    ./vicinae.nix
    ./yazi.nix
    ./ytsub.nix
    ./zathura.nix
  ];

  home.username = "chels";
  home.homeDirectory = "/home/chels";

  programs.bash.enable = true;

  programs.obs-studio = {
    enable = true;
    package = (
      pkgs.obs-studio.override {
        cudaSupport = true;
      }
    );
    plugins = [ pkgs.obs-studio-plugins.obs-pipewire-audio-capture ];
  };

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

  home.stateVersion = "26.05";

  home.packages = [
    t3code
    inputs.codex.packages.${pkgs.stdenv.hostPlatform.system}.default
  ];
}
