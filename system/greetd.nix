{ pkgs, ... }:

let
  tuigreet = "${pkgs.tuigreet}/bin/tuigreet";
  hyprland = "${pkgs.hyprland}/bin/Hyprland";
in
{
  services.greetd = {
    enable = true;

    settings = {
      default_session.command = "${tuigreet} --time --remember --asterisks --cmd ${hyprland}";
      initial_session = {
        command = "${hyprland}";
        user = "chels";
      };
    };
  };
}
