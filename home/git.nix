{ pkgs, ... }:
{
  programs.git = {
    enable = true;
    userName = "Berke Enercan";
    userEmail = "berkeenercan@tutanota.com";
  };

  programs.lazygit.enable = true;
}
