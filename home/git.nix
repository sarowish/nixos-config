{
  programs.git = {
    enable = true;
    userName = "Berke Enercan";
    userEmail = "berkeenercan@tutanota.com";
    signing = {
      format = "ssh";
      key = "~/.ssh/id_ed25519.pub";
      signByDefault = true;
    };
    extraConfig = {
      credential.helper = "store";
    };
  };

  programs.lazygit.enable = true;
}
