{ pkgs, ... }:

let
  writeJSFile = pkgs.writeText;
  discordDomains = [
    "discord.com"
    "discord.gg"
    "discordapp.com"
    "discordapp.net"
    "discord.media"
    "discordcdn.com"
  ];
  discordHosts = pkgs.writeText "byedpi-discord-hosts" (
    builtins.concatStringsSep "\n" discordDomains
  );
  discordPacDomains = builtins.concatStringsSep ",\n" (map builtins.toJSON discordDomains);
  discordPac = writeJSFile "byedpi-discord.pac" ''
    function FindProxyForURL(url, host) {
      var discordDomains = [
        ${discordPacDomains}
      ];

      host = host.toLowerCase();
      for (var i = 0; i < discordDomains.length; i++) {
        var domain = discordDomains[i];
        if (host === domain || dnsDomainIs(host, "." + domain)) {
          return "SOCKS5 127.0.0.1:1080";
        }
      }

      return "DIRECT";
    }
  '';
in
{
  services.byedpi = {
    enable = true;
    extraArgs = [
      "--ip"
      "127.0.0.1"
      "--port"
      "1080"
      "--tlsrec"
      "1+s"
      "--hosts"
      "${discordHosts}"
    ];
  };

  systemd.services.byedpi.serviceConfig = {
    Restart = "on-failure";
    RestartSec = 2;
  };

  home-manager.users.chels.programs.librewolf.profiles.default.settings = {
    "network.proxy.autoconfig_url" = "file://${discordPac}";
    "network.proxy.socks_remote_dns" = true;
    "network.proxy.type" = 2;
  };
}
