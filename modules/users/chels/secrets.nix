{ inputs, ... }:

{
  flake.modules.homeManager.chels =
    { config, ... }:
    {
      imports = [ inputs.sops-nix.homeManagerModules.sops ];

      sops = {
        defaultSopsFile = ../../../secrets/secrets.yaml;
        defaultSopsFormat = "yaml";
        age.keyFile = "${config.xdg.configHome}/sops/age/keys.txt";
        secrets.last_fm = { };
      };
    };
}
