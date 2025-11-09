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

  cfg = config.programs.ytsub;

  tomlFormat = pkgs.formats.toml { };
in
{
  options.programs.ytsub = {
    enable = mkEnableOption "ytsub";

    package = mkPackageOption pkgs "ytsub" { nullable = true; };

    settings = mkOption {
      type = tomlFormat.type;
      default = { };
    };
  };

  config = mkIf cfg.enable {
    home.packages = mkIf (cfg.package != null) [ cfg.package ];

    xdg.configFile."ytsub/config.toml" = mkIf (cfg.settings != { }) {
      source = tomlFormat.generate "config.toml" cfg.settings;
    };
  };
}
