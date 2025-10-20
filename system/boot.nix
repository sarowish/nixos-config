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
    timeout = 0; # boot menu can be accessed by pressing `Space`
  };

  boot.kernelPackages = pkgs.linuxPackages_latest;
}
