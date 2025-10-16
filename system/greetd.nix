{ pkgs, ... }:

let
  tuigreet = "${pkgs.tuigreet}/bin/tuigreet";
in
{
  services.greetd = {
    enable = true;

    settings = {
      default_session.command = "${tuigreet} --time --remember --asterisks --cmd Hyprland";
      initial_session = {
        command = "Hyprland";
        user = "chels";
      };
    };
  };
}
