{ pkgs, ... }:

{
  fonts.packages = with pkgs; [
    cascadia-code
    noto-fonts
    noto-fonts-cjk-sans
    noto-fonts-emoji
    cantarell-fonts
    fira-sans
    nerd-fonts.symbols-only
  ];
}
