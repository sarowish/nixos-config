let
  abbreviations = import ./_abbreviations.nix;
in
{
  flake.modules.homeManager.nushell =
    { config, lib, ... }:
    {
      programs.nushell = {
        enable = true;

        environmentVariables = {
          CARAPACE_LENIENT = 1;
          MANPAGER = "nvim +Man!";
        };

        settings = {
          show_banner = false;
          show_hints = true;
          history = {
            file_format = "sqlite";
            isolation = false;
          };
          completions = {
            algorithm = "fuzzy";
            external.enable = true;
          };
          hinter.closure = lib.hm.nushell.mkNushellInline ''
            {|ctx|
              if ($ctx.line | is-empty) or ($ctx.pos != ($ctx.line | str length)) {
                null
              } else {
                let result = (
                  ^atuin search
                    --cmd-only
                    --print0
                    --limit 1
                    --search-mode prefix
                    -- $ctx.line
                  | complete
                )
                if $result.exit_code != 0 {
                  null
                } else {
                  let command = ($result.stdout | split row (char nul) | get -o 0)
                  if $command == null or not ($command | str starts-with $ctx.line) {
                    null
                  } else {
                    $command | str substring ($ctx.line | str length)..
                  }
                }
              }
            }
          '';
          inherit abbreviations;
        };

        extraConfig = lib.mkAfter ''
          let carapace_completer = $env.config.completions.external.completer

          let fish_completer = {|spans|
            ^${lib.getExe config.programs.fish.package} --command $"complete '--do-complete=($spans | str replace --all "'" "\\'" | str join ' ')'"
            | from tsv --flexible --noheaders --no-infer
            | rename value description
            | update value {|row|
              let value = $row.value
              let need_quote = ['\' ',' '[' ']' '(' ')' ' ' '\t' "'" '"' "`"] | any { $in in $value }
              if ($need_quote and ($value | path exists)) {
                let expanded_path = if ($value starts-with ~) {
                  $value | path expand --no-symlink
                } else {
                  $value
                }
                $'"($expanded_path | str replace --all "\"" "\\\"")"'
              } else {
                $value
              }
            }
          }

          $env.config.completions.external.completer = {|spans|
            let expanded_alias = scope aliases
              | where name == $spans.0
              | get -o 0.expansion

            let spans = if $expanded_alias != null {
              $spans
              | skip 1
              | prepend ($expanded_alias | split row ' ' | take 1)
            } else {
              $spans
            }

            if $spans.0 in ["git" "jj"] {
              do $fish_completer $spans
            } else {
              let carapace_result = try {
                do $carapace_completer $spans
              } catch {
                null
              }

              if ($carapace_result | is-empty) {
                do $fish_completer $spans
              } else {
                $carapace_result
              }
            }
          }

          $env.config.keybindings ++= [
            {
              name: skim_files
              modifier: control
              keycode: char_t
              mode: [emacs vi_normal vi_insert]
              event: {
                send: executehostcommand
                cmd: "
                  let files = (
                    ^fd --hidden --follow --exclude .git --print0
                    | ^sk --read0 --print0 --multi --reverse --scheme path
                    | decode utf-8
                    | split row (char nul)
                    | where { is-not-empty }
                    | each { to nuon --raw }
                    | str join ' '
                  )
                  if ($files | is-not-empty) {
                    let prefix = if (commandline | is-empty) or (commandline | str ends-with ' ') {
                      \"\"
                    } else {
                      ' '
                    }
                    commandline edit --insert $'($prefix)($files) '
                  }
                "
              }
            }
          ]
        '';
      };

      programs.carapace = {
        enable = true;
        enableBashIntegration = false;
        enableFishIntegration = false;
        enableNushellIntegration = true;
        enableZshIntegration = false;
      };
    };
}
