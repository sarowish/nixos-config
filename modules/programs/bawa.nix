{ inputs, ... }:

let
  bawaModule =
    {
      config,
      lib,
      pkgs,
      ...
    }:
    let
      cfg = config.programs.bawa;
      tomlFormat = pkgs.formats.toml { };
    in
    {
      options.programs.bawa = {
        enable = lib.mkEnableOption "bawa";
        package = lib.mkPackageOption pkgs "bawa" { nullable = true; };
        settings = lib.mkOption {
          type = tomlFormat.type;
          default = { };
        };
      };

      config = lib.mkIf cfg.enable {
        home.packages = lib.mkIf (cfg.package != null) [ cfg.package ];
        xdg.configFile."bawa/config.toml" = lib.mkIf (cfg.settings != { }) {
          source = tomlFormat.generate "config.toml" cfg.settings;
        };
      };
    };
in
{
  flake.modules.homeManager.bawa =
    { pkgs, ... }:
    {
      imports = [ bawaModule ];
      programs.bawa = {
        enable = true;
        package = inputs.bawa.packages.${pkgs.stdenv.hostPlatform.system}.default;
      };
    };
}
