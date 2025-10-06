{ pkgs, ... }:

{
  networking.hostName = "be";

  systemd.network = {
    networks."enp34s0" = {
      matchConfig.name = "enp34s0";
      networkConfig.DHCP = "ipv4";
    };
  };

  services.resolved.enable = true;
  services.mullvad-vpn.enable = true;
}
