{
  flake.modules.homeManager.shell = {
    home.shell = {
      enableFishIntegration = true;
      enableNushellIntegration = true;
    };

    programs = {
      bash.enable = true;

      fd = {
        enable = true;
        hidden = true;
      };

      starship = {
        enable = true;
        settings = {
          add_newline = false;
          line_break.disabled = true;
          character = {
            success_symbol = "[➜](bold green) ";
            error_symbol = "[➜](bold red) ";
          };
        };
      };

      television = {
        enable = true;
        enableFishIntegration = true;
        enableNushellIntegration = true;
        # Television replaces the entire trigger table when it is configured.
        settings.shell_integration.channel_triggers = {
          alias = [
            "alias"
            "unalias"
          ];
          env = [
            "export"
            "unset"
          ];
          dirs = [
            "cd"
            "ls"
            "rmdir"
            "z"
          ];
          files = [
            "cat"
            "less"
            "head"
            "tail"
            "vim"
            "nvim"
            "nano"
            "bat"
            "cp"
            "mv"
            "rm"
            "touch"
            "chmod"
            "chown"
            "ln"
            "tar"
            "zip"
            "unzip"
            "gzip"
            "gunzip"
            "xz"
          ];
          git-diff = [
            "git add"
            "git restore"
          ];
          git-branch = [
            "git checkout"
            "git switch"
            "git branch"
            "git merge"
            "git rebase"
            "git pull"
            "git push"
          ];
          git-log = [
            "git log"
            "git show"
          ];
          docker-images = [ "docker run" ];
          git-repos = [
            "code"
            "hx"
            "git clone"
          ];
        };
      };

      zoxide.enable = true;
    };
  };
}
