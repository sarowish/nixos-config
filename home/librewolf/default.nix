{ pkgs, inputs, ... }:

{
  programs.librewolf = {
    enable = true;

    profiles.default = {
      settings = {
        "browser.compactmode.show" = true;
        "browser.newtabpage.enabled" = false;
        "browser.startup.homepage" = "chrome://browser/content/blanktab.html";
        "browser.tabs.allow_transparent_browser" = true;

        "browser.toolbars.bookmarks.visibility" = "never";

        "browser.urlbar.suggest.bookmark" = false;
        "browser.urlbar.suggest.history" = false;

        "general.autoScroll" = true;
        "middlemouse.paste" = false;

        "privacy.clearHistory.cookiesAndStorage" = false;
        "privacy.fingerprintingProtection.overrides" = "+AllTargets,-CSSPrefersColorScheme";
        "privacy.resistFingerprinting" = false;

        "sidebar.verticalTabs" = true;
        "sidebar.visibility" = "expand-on-hover";
        "sidebar.animation.expand-on-hover.duration-ms" = 0;
        "sidebar.verticalTabs.dragToPinPromo.dismissed" = true;

        "browser.uiCustomization.state" = builtins.toJSON {
          placements = {
            widget-overflow-fixed-list = [ ];
            unified-extensions-area = [
              "sponsorblocker_ajay_app-browser-action"
              "_a6c4a591-f1b2-4f03-b3ff-767e5bedf4e7_-browser-action"
            ];
            nav-bar = [
              "sidebar-button"
              "back-button"
              "forward-button"
              "stop-reload-button"
              "customizableui-special-spring1"
              "vertical-spacer"
              "urlbar-container"
              "customizableui-special-spring2"
              "downloads-button"
              "fxa-toolbar-menu-button"
              "unified-extensions-button"
              "_446900e4-71c2-419f-a6a7-df9c091e268b_-browser-action"
              "addon_darkreader_org-browser-action"
              "ublock0_raymondhill_net-browser-action"
              "alltabs-button"
            ];
            toolbar-menubar = [ "menubar-items" ];
            TabsToolbar = [ ];
            vertical-tabs = [ "tabbrowser-tabs" ];
            PersonalToolbar = [ "personal-bookmarks" ];
          };
          seen = [
            "developer-button"
            "screenshot-button"
            "ublock0_raymondhill_net-browser-action"
            "addon_darkreader_org-browser-action"
            "_446900e4-71c2-419f-a6a7-df9c091e268b_-browser-action"
            "sponsorblocker_ajay_app-browser-action"
            "_a6c4a591-f1b2-4f03-b3ff-767e5bedf4e7_-browser-action"
          ];
          dirtyAreaCache = [
            "nav-bar"
            "vertical-tabs"
            "toolbar-menubar"
            "TabsToolbar"
            "PersonalToolbar"
            "unified-extensions-area"
          ];
          currentVersion = 23;
          newElementCount = 3;
        };

        "toolkit.legacyUserProfileCustomizations.stylesheets" = true;
        "svg.context-properties.content.enabled" = true;

        "extensions.activeThemeID" = "firefox-compact-dark@mozilla.org";
      };
      extensions = {
        packages = with inputs.firefox-addons.packages.${pkgs.system}; [
          bitwarden
          sponsorblock
          darkreader
          user-agent-string-switcher
        ];
      };
      userChrome = builtins.readFile ./userChrome.css;
      userContent = builtins.readFile ./userContent.css;
    };
  };
}
