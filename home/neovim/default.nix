{ pkgs, config, ... }:
let
  inherit (config.lib.file) mkOutOfStoreSymlink;
in
{
  xdg.configFile.nvim = {
    source = mkOutOfStoreSymlink "${config.home.homeDirectory}/nixos-config/home/neovim/config";
    recursive = true;
  };

  programs.neovim = {
    enable = true;
    viAlias = true;
    vimAlias = true;
    defaultEditor = true;

    extraPackages = with pkgs; [
      nixd
      lua-language-server
    ];
  };
}
