{ inputs, ... }:

let
  mpdHeraldModule =
    {
      config,
      lib,
      pkgs,
      ...
    }:
    let
      cfg = config.services.mpd-herald;
      tomlFormat = pkgs.formats.toml { };
    in
    {
      options.services.mpd-herald = {
        enable = lib.mkEnableOption "mpd-herald";
        package = lib.mkPackageOption pkgs "mpd-herald" { nullable = true; };
        settings = lib.mkOption {
          type = tomlFormat.type;
          default = { };
        };
      };

      config = lib.mkIf cfg.enable {
        home.packages = lib.mkIf (cfg.package != null) [ cfg.package ];
        xdg.configFile."mpd-herald/config.toml" = lib.mkIf (cfg.settings != { }) {
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
    };
in
{
  flake.modules.homeManager.mpd =
    { pkgs, ... }:
    let
      # Temporary pin: beta-1 uses sidebar properties that require libadwaita 1.10.
      euphonica = pkgs.euphonica.overrideAttrs (
        finalAttrs: _: {
          version = "0.99.8-beta";
          src = pkgs.fetchFromGitHub {
            owner = "htkhiem";
            repo = "euphonica";
            tag = "v${finalAttrs.version}";
            hash = "sha256-AKM/gyvndgq2rnusoI/TU3C9hIplymQH/RxgBFE42Rs=";
            fetchSubmodules = true;
          };
          cargoDeps = pkgs.rustPlatform.fetchCargoVendor {
            inherit (finalAttrs) pname version src;
            hash = "sha256-ppWKQkQu37HNvG37I9BEO+MA/pU29kZ7w3KGdzXLbVM=";
          };
        }
      );
    in
    {
      imports = [ mpdHeraldModule ];
      home.packages = with pkgs; [
        mpc
        euphonica
      ];
      services.mpd = {
        enable = true;
        extraConfig = ''
          audio_output {
              type "pipewire"
              name "Pipewire Output"
          }
        '';
      };
      services.mpd-herald = {
        enable = true;
        package = inputs.mpd-herald.packages.${pkgs.stdenv.hostPlatform.system}.default;
      };
    };
}
