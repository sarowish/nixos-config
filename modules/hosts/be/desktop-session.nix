{
  flake.modules.nixos.be =
    { pkgs, ... }:
    let
      tuigreet = "${pkgs.tuigreet}/bin/tuigreet";
    in
    {
      services.greetd.settings = {
        default_session.command = "${tuigreet} --time --remember --asterisks --cmd niri-session";
        initial_session = {
          command = "niri-session";
          user = "chels";
        };
      };
    };
}
