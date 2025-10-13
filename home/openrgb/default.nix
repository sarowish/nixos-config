{ pkgs, config, ... }:
let
  openrgb_color = pkgs.python3Packages.buildPythonApplication rec {
    pname = "openrgb_color";
    version = "0.1.0";

    pyproject = false;
    dontUnpack = true;

    dependencies = with pkgs.python3Packages; [ openrgb-python ];

    installPhase = ''
      install -Dm755 "${./set_color.py}" "$out/bin/${pname}"
    '';

  };
  target = "graphical-session.target";
in
{
  home.packages = [
    openrgb_color
  ];

  systemd.user.services.openrgb = {
    Unit = {
      Description = "Set the colors of devices";
      PartOf = [ target ];
      After = [ target ];
    };

    Service = {
      ExecStart = "${openrgb_color}/bin/openrgb_color ${config.colors.accent}";
      Type = "oneshot";
    };

    Install.WantedBy = [
      target
    ];
  };
}
