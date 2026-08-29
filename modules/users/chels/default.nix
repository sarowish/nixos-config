{
  flake.modules.nixos.user-chels = {
    users.users.chels = {
      isNormalUser = true;
      extraGroups = [
        "wheel"
        "openrazer"
      ];
    };
  };

  flake.modules.homeManager.chels = {
    home.username = "chels";
    home.homeDirectory = "/home/chels";
    home.stateVersion = "26.05";
  };
}
