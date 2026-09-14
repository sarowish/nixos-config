let
  abbreviations = import ./_abbreviations.nix;
in
{
  flake.modules.homeManager.fish = {
    programs.fish = {
      enable = true;
      generateCompletions = false;
      interactiveShellInit = ''
        set fish_greeting
        set -x MANPAGER 'nvim +Man!'
      '';
      shellAbbrs = abbreviations;
    };
  };
}
