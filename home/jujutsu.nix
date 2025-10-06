{ config, pkgs, ... }:

{
  home.packages = with pkgs; [
    lazyjj
  ];

  programs.jujutsu = {
    enable = true;

    settings = {
      "$schema" = "https://jj-vcs.github.io/jj/latest/config-schema.json";

      user = with config.programs.git; {
        name = userName;
        email = userEmail;
      };

      ui.default-command = "log";

      signing = {
        behavior = "drop";
        backend = "gpg";
      };

      git.sign-on-push = true;
    };
  };
}
