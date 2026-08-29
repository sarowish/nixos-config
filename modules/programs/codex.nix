{ inputs, ... }:

{
  flake.modules.homeManager.codex =
    { pkgs, ... }:
    {
      home.packages = [
        inputs.nix-t3code.packages.${pkgs.stdenv.hostPlatform.system}.t3code
        inputs.codex.packages.${pkgs.stdenv.hostPlatform.system}.default
      ];
    };
}
