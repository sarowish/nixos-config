{
  flake.modules.homeManager.atuin =
    {
      config,
      lib,
      pkgs,
      ...
    }:
    let
      atuinNushellConfig =
        pkgs.runCommand "atuin-nushell-config.nu"
          {
            nativeBuildInputs = [ pkgs.writableTmpDirAsHomeHook ];
          }
          ''
            ${lib.getExe config.programs.atuin.package} init nu \
              ${lib.escapeShellArgs config.programs.atuin.flags} > "$out"
            # Give prompt integrations a stable way to ignore Atuin's internal job.
            substituteInPlace "$out" \
              --replace-fail \
              'job spawn {' \
              'job spawn --description atuin-history-end {'
          '';
    in
    {
      programs.atuin = {
        enable = true;
        enableNushellIntegration = false;
        settings = {
          invert = true;
          search.shells = "all";
        };
        flags = [ "--disable-up-arrow" ];
        enableFishIntegration = true;
      };

      programs.nushell.extraConfig = ''
        source ${atuinNushellConfig}
      '';

      programs.fish.interactiveShellInit = lib.mkOrder 2100 ''
        set -gx ATUIN_NOBIND "true"

        bind ctrl-r _atuin_search
        bind -M insert ctrl-r _atuin_search
      '';
    };
}
