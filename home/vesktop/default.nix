{
  config,
  inputs,
  pkgs,
  ...
}:

let
  vesktopWithByedpi = pkgs.symlinkJoin {
    name = "vesktop-with-byedpi";
    paths = [ config.programs.nixcord.finalPackage.vesktop ];
    nativeBuildInputs = [ pkgs.makeWrapper ];
    postBuild = ''
      wrapProgram "$out/bin/vesktop" \
        --add-flags "--proxy-server=socks5://127.0.0.1:1080" \
        --add-flags "--disable-quic"
    '';
  };
in
{
  home.packages = [ vesktopWithByedpi ];

  imports = [ inputs.nixcord.homeModules.nixcord ];

  programs.nixcord = {
    enable = true;
    discord.enable = false;
    vesktop = {
      enable = true;
      autoscroll.enable = true;
      installPackage = false;

      settings = {
        discordBranch = "stable";
        tray = false;
        enableSplashScreen = false;
        arRPC = true;
      };
    };

    quickCss = builtins.readFile ./quickCss.css;

    userPlugins."mpdControls.desktop" = "github:sarowish/mpdControls/3f65bfd2420075068ecf5e75e6ab1f89106930cb";
    extraConfig.plugins.MPDControls.enable = true;

    config = {
      useQuickCss = true;
      transparent = true;
      plugins = {
        alwaysExpandRoles.enable = true;
        characterCounter.enable = true;
        expressionCloner.enable = true;
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
