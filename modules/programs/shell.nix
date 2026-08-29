{
  flake.modules.homeManager.shell = {
    programs.bash.enable = true;
    programs.direnv.enable = true;
    programs.fd = {
      enable = true;
      hidden = true;
    };
  };
}
