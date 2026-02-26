{ inputs, pkgs, ... }:
{
  programs.bawa = {
    enable = true;
    package = inputs.bawa.packages.${pkgs.stdenv.hostPlatform.system}.default;
  };
}
