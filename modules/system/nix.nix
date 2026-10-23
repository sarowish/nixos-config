{
  flake.modules.nixos.nix = {
    nix.settings = {
      experimental-features = [
        "nix-command"
        "flakes"
      ];
      extra-substituters = [
        "https://ytsub.cachix.org"
        "https://niri.cachix.org"
        "https://hyprland.cachix.org"
      ];
      extra-trusted-public-keys = [
        "ytsub.cachix.org-1:+//b4AUWp/46hIbTHVLhCU+DIP7TowiUWzM6Hsn8Ryg="
        "niri.cachix.org-1:Wv0OmO7PsuocRKzfDoJ3mulSl7Z6oezYhGhR+3W2964="
        "hyprland.cachix.org-1:a7pgxzMz7+chwVL3/pzj6jIBMioiJM7ypFP8PwtkuGc="
      ];
    };
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
