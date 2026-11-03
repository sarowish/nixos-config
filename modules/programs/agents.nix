{ inputs, ... }:

{
  flake.modules.homeManager.agents =
    { pkgs, ... }:
    {
      home.packages = [
        inputs.nix-t3code.packages.${pkgs.stdenv.hostPlatform.system}.t3code
        inputs.codex.packages.${pkgs.stdenv.hostPlatform.system}.default
        inputs.claude-code.packages.${pkgs.stdenv.hostPlatform.system}.default
      ];
    };
}
