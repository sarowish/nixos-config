{
  flake.modules.nixos.sudo = {
    security.sudo.extraConfig = "Defaults pwfeedback";
  };
}
