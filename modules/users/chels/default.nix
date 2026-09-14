{
  flake.modules.nixos.user-chels =
    { pkgs, ... }:
    {
      users.users.chels = {
        isNormalUser = true;
        shell = pkgs.nushell;
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
