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

  cfg = config.programs.bawa;

  tomlFormat = pkgs.formats.toml { };
in
{
  options.programs.bawa = {
    enable = mkEnableOption "bawa";

    package = mkPackageOption pkgs "bawa" { nullable = true; };

    settings = mkOption {
      type = tomlFormat.type;
      default = { };
    };
  };

  config = mkIf cfg.enable {
    home.packages = mkIf (cfg.package != null) [ cfg.package ];

    xdg.configFile."bawa/config.toml" = mkIf (cfg.settings != { }) {
      source = tomlFormat.generate "config.toml" cfg.settings;
    };
  };
}
