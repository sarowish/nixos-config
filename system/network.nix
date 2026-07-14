{
  networking.hostName = "be";
  networking.useDHCP = false;
  networking.useNetworkd = true;
  networking.interfaces.enp34s0 = {
    ipv4.addresses = [
      {
        address = "192.168.1.130";
        prefixLength = 24;
      }
    ];
  };
  networking.defaultGateway = {
    address = "192.168.1.1";
    interface = "enp34s0";
  };

  systemd.network.wait-online.enable = false;

  services.resolved = {
    enable = true;
    settings.Resolve = {
      DNS = [
        "1.1.1.1#one.one.one.one"
        "1.0.0.1#one.one.one.one"
      ];
      DNSOverTLS = true;
      Domains = [ "~." ];
    };
  };

  services.mullvad-vpn.enable = true;
}
