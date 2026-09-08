{
  flake.modules.homeManager.awww =
    { lib, pkgs, ... }:
    let
      overviewNamespace = "overview";
      blurSigma = 20;

      syncOverview = pkgs.writeShellApplication {
        name = "awww-sync-overview";
        runtimeInputs = with pkgs; [
          coreutils
          ffmpeg
          jq
        ];
        text = ''
          overview_cache="''${XDG_CACHE_HOME:-$HOME/.cache}/awww-overview"
          mkdir -p "$overview_cache"

          wallpaper_state="$(${pkgs.awww}/bin/awww query --json)"
          ${pkgs.awww}/bin/awww query --namespace ${overviewNamespace} >/dev/null

          while IFS=$'\t' read -r output_name wallpaper_path; do
            if [[ ! -f "$wallpaper_path" ]]; then
              continue
            fi

            wallpaper_key="$(printf '%s\0%s' "$wallpaper_path" '${toString blurSigma}' | sha256sum | cut -d ' ' -f 1)"
            blurred_wallpaper="$overview_cache/$wallpaper_key.png"

            if [[ ! -f "$blurred_wallpaper" || "$wallpaper_path" -nt "$blurred_wallpaper" ]]; then
              blurred_tmp="$(mktemp --tmpdir="$overview_cache" .blurred.XXXXXX.png)"
              trap 'rm -f "$blurred_tmp"' EXIT
              ffmpeg \
                -nostdin \
                -hide_banner \
                -loglevel error \
                -y \
                -i "$wallpaper_path" \
                -vf "gblur=sigma=${toString blurSigma}:steps=2" \
                -frames:v 1 \
                -update 1 \
                "$blurred_tmp"
              mv "$blurred_tmp" "$blurred_wallpaper"
              trap - EXIT
            fi

            ${pkgs.awww}/bin/awww img \
              --namespace ${overviewNamespace} \
              --outputs "$output_name" \
              --transition-type none \
              "$blurred_wallpaper"
          done < <(
            printf '%s' "$wallpaper_state" \
              | jq -r '.[""][] | select(.displaying.image? != null) | [.name, .displaying.image] | @tsv'
          )
        '';
      };

      awww = pkgs.writeShellApplication {
        name = "awww";
        runtimeInputs = [ syncOverview ];
        text = ''
          subcommand="''${1:-}"
          ${pkgs.awww}/bin/awww "$@"

          if [[ "$subcommand" == "img" && -n "''${NIRI_SOCKET:-}" ]]; then
            awww-sync-overview
          fi
        '';
      };
    in
    {
      home.packages = [
        (lib.hiPrio awww)
        pkgs.awww
      ];

      systemd.user.services.awww-daemon = {
        Unit = {
          Description = "awww wallpaper daemon";
          PartOf = [ "graphical-session.target" ];
          After = [ "graphical-session.target" ];
        };
        Service = {
          ExecStart = "${pkgs.awww}/bin/awww-daemon";
          Restart = "on-failure";
        };
        Install = {
          WantedBy = [ "graphical-session.target" ];
        };
      };

      systemd.user.services.awww-overview-daemon = {
        Unit = {
          Description = "awww overview backdrop daemon";
          ConditionEnvironment = "NIRI_SOCKET";
          PartOf = [ "graphical-session.target" ];
          After = [ "graphical-session.target" ];
        };
        Service = {
          ExecStart = "${pkgs.awww}/bin/awww-daemon --namespace ${overviewNamespace}";
          Restart = "on-failure";
        };
        Install = {
          WantedBy = [ "graphical-session.target" ];
        };
      };

      systemd.user.services.awww-overview-sync = {
        Unit = {
          Description = "Generate the blurred overview wallpaper";
          ConditionEnvironment = "NIRI_SOCKET";
          Requires = [
            "awww-daemon.service"
            "awww-overview-daemon.service"
          ];
          After = [
            "awww-daemon.service"
            "awww-overview-daemon.service"
          ];
          PartOf = [ "graphical-session.target" ];
        };
        Service = {
          Type = "oneshot";
          ExecStart = "${syncOverview}/bin/awww-sync-overview";
          RemainAfterExit = true;
          Restart = "on-failure";
          RestartSec = "1s";
        };
        Install = {
          WantedBy = [ "graphical-session.target" ];
        };
      };
    };
}
