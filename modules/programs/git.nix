{
  flake.modules.homeManager.git = {
    programs.git = {
      enable = true;

      settings = {
        user = {
          name = "Berke Enercan";
          email = "berkeenercan@tutanota.com";
        };
        credential.helper = "store";
      };

      ignores = [ ".agent-notes/" ];

      signing = {
        format = "ssh";
        key = "~/.ssh/id_ed25519.pub";
        signByDefault = true;
      };
    };

    programs.lazygit.enable = true;
  };
}
