{
  flake.modules.nixos.greetd =
    { lib, pkgs, ... }:
    let
      tuigreet = "${pkgs.tuigreet}/bin/tuigreet";
    in
    {
      services.greetd = {
        enable = true;
        settings.default_session.command = lib.mkDefault "${tuigreet} --time --remember --asterisks";
      };
    };
}
