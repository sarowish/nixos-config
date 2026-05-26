{
  lib,
  config,
  pkgs,
  ...
}:
let
  inherit (lib)
    mkOption
    mkEnableOption
    mkPackageOption
    mkIf
    ;

  cfg = config.services.mpd-herald;

  tomlFormat = pkgs.formats.toml { };
in
{
  options.services.mpd-herald = {
    enable = mkEnableOption "mpd-herald";

    package = mkPackageOption pkgs "mpd-herald" { nullable = true; };

    settings = mkOption {
      type = tomlFormat.type;
      default = { };
    };
  };

  config = mkIf cfg.enable {
    home.packages = mkIf (cfg.package != null) [ cfg.package ];

    xdg.configFile."mpd-herald/config.toml" = mkIf (cfg.settings != { }) {
      source = tomlFormat.generate "config.toml" cfg.settings;
    };

    systemd.user.services.mpd-herald = {
      Unit = {
        Description = "MPD companion for notifications, Discord Rich Presence, and Last.fm scrobbling";
        After = [ "mpd.service" ];
        PartOf = [ "mpd.service" ];
      };
      Service = {
        ExecStart = "${cfg.package}/bin/mpd-herald";
        Restart = "on-failure";
      };
      Install.WantedBy = [ "mpd.service" ];
    };
  };
}
