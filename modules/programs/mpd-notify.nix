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

  cfg = config.services.mpd-notify;

  tomlFormat = pkgs.formats.toml { };
in
{
  options.services.mpd-notify = {
    enable = mkEnableOption "mpd-notify";

    package = mkPackageOption pkgs "mpd-notify" { nullable = true; };

    settings = mkOption {
      type = tomlFormat.type;
      default = { };
    };
  };

  config = mkIf cfg.enable {
    home.packages = mkIf (cfg.package != null) [ cfg.package ];

    xdg.configFile."mpd-notify/config.toml" = mkIf (cfg.settings != { }) {
      source = tomlFormat.generate "config.toml" cfg.settings;
    };

    systemd.user.services.mpd-notify = {
      Unit = {
        Description = "Notifier for MPD";
        After = [ "mpd.service" ];
        PartOf = [ "mpd.service" ];
      };
      Service = {
        ExecStart = "${cfg.package}/bin/mpd-notify";
        Restart = "on-failure";
      };
      Install.WantedBy = [ "mpd.service" ];
    };
  };
}
