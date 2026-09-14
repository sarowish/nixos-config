{
  flake.modules.homeManager.shell = {
    home.shell = {
      enableFishIntegration = true;
      enableNushellIntegration = true;
    };

    programs = {
      bash.enable = true;
      direnv.enable = true;

      fd = {
        enable = true;
        hidden = true;
      };

      skim = {
        enable = true;
        enableFishIntegration = true;
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

      zoxide.enable = true;
    };
  };
}
