{
  flake.modules.nixos.openrazer = {
    hardware.openrazer = {
      enable = true;
      batteryNotifier = {
        frequency = 3600;
        percentage = 7;
      };
    };
  };
}
