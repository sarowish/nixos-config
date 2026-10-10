{ inputs, ... }:
{
  flake.modules.homeManager.vesktop =
    {
      config,
      pkgs,
      ...
    }:

    let
      trayCountIcons =
        pkgs.runCommand "vesktop-tray-count-icons" { nativeBuildInputs = [ pkgs.imagemagick ]; }
          ''
            mkdir -p "$out"
            for count in 1 2 3 4 5 6 7 8 9 '9+'; do
              font_size=64
              if [ "$count" = '9+' ]; then font_size=52; fi
              magick -size 64x64 xc:none \
                -fill '#ed4245' -draw 'circle 31.5,31.5 31.5,0' \
                -font ${pkgs.fira-sans}/share/fonts/opentype/FiraSans-Bold.otf \
                -pointsize "$font_size" -fill white -gravity center -annotate +0+0 "$count" \
                "$out/count-$count.png"
            done
          '';
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
          package = pkgs.vesktop.overrideAttrs (old: {
            patches = (old.patches or [ ]) ++ [ ../../../patches/vesktop-tray-count.patch ];
            postPatch = (old.postPatch or "") + ''
              cp ${trayCountIcons}/*.png static/tray/
            '';
          });
          autoscroll.enable = true;
          installPackage = false;

          settings = {
            discordBranch = "stable";
            tray = true;
            appBadge = true;
            enableSplashScreen = false;
            arRPC = true;
          };
        };

        quickCss = builtins.readFile ./quickCss.css;

        userPlugins."mpdControls.desktop" =
          "github:sarowish/mpdControls/3f65bfd2420075068ecf5e75e6ab1f89106930cb";
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
    };
}
