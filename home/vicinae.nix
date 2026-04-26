{ inputs, pkgs, ... }:
{
  imports = [ inputs.vicinae.homeManagerModules.default ];

  services.vicinae = {
    enable = true;
    systemd.enable = true;

    settings = {
      telemetry.system_info = false;
      pop_to_root_on_close = true;

      theme.dark.name = "catppuccin-mocha";
      launcher_window.opacity = 0.8;
    };

    extensions = with inputs.vicinae-extensions.packages.${pkgs.stdenv.hostPlatform.system}; [
      awww-switcher
      mullvad
      nix
    ];
  };
}
