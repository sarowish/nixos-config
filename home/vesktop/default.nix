{ inputs, ... }:
{
  imports = [ inputs.nixcord.homeModules.nixcord ];

  programs.nixcord = {
    enable = true;
    discord.enable = false;
    vesktop = {
      enable = true;
      autoscroll.enable = true;

      settings = {
        discordBranch = "stable";
        tray = false;
        enableSplashScreen = false;
        arRPC = true;
      };
    };

    config = {
      useQuickCss = true;
      transparent = true;
      plugins = {
        accountPanelServerProfile.enable = true;
        betterFolders.enable = true;
        expressionCloner.enable = true;
        friendsSince.enable = true;
        memberCount.enable = true;
        mentionAvatars.enable = true;
        noReplyMention.enable = true;
        noUnblockToJump.enable = true;
        previewMessage.enable = true;
        showTimeoutDuration.enable = true;
        typingIndicator.enable = true;
        youtubeAdblock.enable = true;
      };
    };

  };
}
