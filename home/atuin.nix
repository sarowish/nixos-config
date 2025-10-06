{
  programs.atuin = {
    enable = true;
    settings = {
      invert = true;
    };
    enableFishIntegration = true;
  };

  programs.fish.interactiveShellInit = ''
    set -gx ATUIN_NOBIND "true"

    bind ctrl-r _atuin_search
    bind -M insert ctrl-r _atuin_search
  '';
}
