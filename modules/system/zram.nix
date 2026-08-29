{
  flake.modules.nixos.zram = {
    zramSwap = {
      enable = true;
      algorithm = "zstd";
      memoryPercent = 100;
    };
  };
}
