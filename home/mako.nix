{ config, ... }:

{
  services.mako = {
    enable = true;
    settings = {
      background-color = "#1e1e2ebb";
      border-color = "#${config.colors.accent}";
      border-radius = 8;

      default-timeout = 5000;
      layer = "overlay";
      font = "Fira Sans Book 10";
    };
  };
}
