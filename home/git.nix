{
  programs.git = {
    enable = true;

    settings = {
      user = {
        name = "Berke Enercan";
        email = "berkeenercan@tutanota.com";
      };
      credential.helper = "store";
    };

    signing = {
      format = "ssh";
      key = "~/.ssh/id_ed25519.pub";
      signByDefault = true;
    };
  };

  programs.lazygit.enable = true;
}
