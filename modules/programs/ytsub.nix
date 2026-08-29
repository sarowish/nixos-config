{ inputs, ... }:

let
  ytsubModule =
    {
      config,
      lib,
      pkgs,
      ...
    }:
    let
      cfg = config.programs.ytsub;
      tomlFormat = pkgs.formats.toml { };
    in
    {
      options.programs.ytsub = {
        enable = lib.mkEnableOption "ytsub";
        package = lib.mkPackageOption pkgs "ytsub" { nullable = true; };
        settings = lib.mkOption {
          type = tomlFormat.type;
          default = { };
        };
      };

      config = lib.mkIf cfg.enable {
        home.packages = lib.mkIf (cfg.package != null) [ cfg.package ];
        xdg.configFile."ytsub/config.toml" = lib.mkIf (cfg.settings != { }) {
          source = tomlFormat.generate "config.toml" cfg.settings;
        };
      };
    };
in
{
  flake.modules.homeManager.ytsub =
    { pkgs, ... }:
    {
      imports = [ ytsubModule ];
      programs.ytsub = {
        enable = true;
        package = inputs.ytsub.packages.${pkgs.stdenv.hostPlatform.system}.default;
        settings = {
          highlight_symbol = "|";
          tabs = [
            "videos"
            "streams"
          ];
          refresh_on_launch = false;
          refresh_threshold = 0;
          subtitle_languages = [
            "en"
            "tr"
          ];
          theme = {
            focused = {
              fg = "Magenta";
              bg = "Black";
              modifiers = "bold";
            };
            error = {
              fg = "Red";
              modifiers = "italic";
            };
          };
        };
      };
    };
}
