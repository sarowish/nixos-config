{ pkgs, ... }:
{
  home.sessionVariables.SHELL = "${pkgs.fish}/bin/fish";

  programs.fish = {
    enable = true;
    interactiveShellInit = ''
      set fish_greeting
      set -x MANPAGER 'nvim +Man!'
    '';
    shellAbbrs = {
      ip = "ip -c";
      neovim = "nvim";
      n = "nvim";
      mix = "pulsemixer";
      neofetch = "hyfetch";
      bw = "bawa";
      zatt = "zathura --fork";
    };
  };

  programs.zoxide = {
    enable = true;
    enableFishIntegration = true;
  };

  programs.skim = {
    enable = true;
    enableFishIntegration = true;
  };

  programs.starship = {
    enable = true;
    enableFishIntegration = true;
    settings = {
      add_newline = false;
      line_break.disabled = true;
      character = {
        success_symbol = "[➜](bold green) ";
        error_symbol = "[➜](bold red) ";
      };
    };
  };
}
