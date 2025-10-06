{ pkgs, ... }:

{
  boot.loader = {
    systemd-boot = {
      enable = true;
      consoleMode = "max";
      configurationLimit = 10;
      editor = false;
    };

    efi.canTouchEfiVariables = true;
    timeout = 2;
  };

  boot.kernelPackages = pkgs.linuxPackages_latest;
}
