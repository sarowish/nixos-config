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
        alwaysExpandRoles.enable = true;
        characterCounter.enable = true;
        expressionCloner.enable = true;
        friendsSince.enable = true;
        gameActivityToggle.enable = true;
        memberCount.enable = true;
        mentionAvatars.enable = true;
        moreQuickReactions.enable = true;
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
