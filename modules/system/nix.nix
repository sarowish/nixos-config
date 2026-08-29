{
  flake.modules.nixos.nix = {
    nix.settings.experimental-features = [
      "nix-command"
      "flakes"
    ];
    nixpkgs.config.allowUnfree = true;

    nix.gc = {
      automatic = true;
      dates = "weekly";
      options = "--delete-older-than 15d";
    };
    nix.extraOptions = ''
      min-free = ${toString (1024 * 1024 * 1024)}
      max-free = ${toString (8 * 1024 * 1024 * 1024)}
    '';
  };
}
