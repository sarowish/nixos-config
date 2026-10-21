{
  flake.modules.homeManager.shell = {
    programs.direnv.enable = true;
  };

  flake.modules.homeManager.nushell =
    { config, lib, ... }:
    {
      programs.direnv.enableNushellIntegration = false;

      # Keep Home Manager's direnv handling after other prompt integrations.
      programs.nushell.extraConfig = lib.mkIf config.programs.direnv.enable (
        lib.mkOrder 1600 ''
          $env.config.hooks.pre_prompt = (
            $env.config.hooks.pre_prompt?
            | default []
            | append {||
              # Nix's lowercase `shell` also refers to `SHELL` in Nushell.
              # Filter it before applying either updates or removals.
              let direnv = (
                ${lib.getExe config.programs.direnv.package} export json
                | from json --strict
                | default {}
                | reject --optional shell
              )

              for key in ($direnv | columns) {
                if ($direnv | get $key) == null {
                  hide-env --ignore-errors $key
                }
              }

              $direnv
              | items {|key, value|
                let value = do (
                  {
                    "PATH": {
                      from_string: {|s| $s | split row (char esep) | path expand --no-symlink }
                      to_string: {|v| $v | path expand --no-symlink | str join (char esep) }
                    }
                  }
                  | merge ($env.ENV_CONVERSIONS? | default {})
                  | get ([[value, optional, insensitive]; [$key, true, true] [from_string, true, false]] | into cell-path)
                  | if ($in | is-empty) { {|x| $x} } else { $in }
                ) $value
                return [ $key $value ]
              }
              | where {|pair| $pair.1 != null }
              | into record
              | load-env
            }
          )
        ''
      );
    };
}
