{ lib, ... }:
{
  programs.atuin = {
    enable = true;
    settings = {
      invert = true;
    };
    flags = [ "--disable-up-arrow" ];
    enableFishIntegration = true;
  };

  programs.fish.interactiveShellInit = lib.mkOrder 2100 ''
    set -gx ATUIN_NOBIND "true"

    bind ctrl-r _atuin_search
    bind -M insert ctrl-r _atuin_search
  '';
}
