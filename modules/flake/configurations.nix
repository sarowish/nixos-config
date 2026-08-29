{
  config,
  inputs,
  ...
}:

{
  imports = [
    inputs.flake-parts.flakeModules.modules
    inputs.flake-parts.flakeModules.touchup
  ];

  # The registry is only needed while assembling this flake.
  config.touchup.attr.modules.enable = false;

  config.flake.nixosConfigurations.be = inputs.nixpkgs.lib.nixosSystem {
    system = "x86_64-linux";
    modules = [
      inputs.disko.nixosModules.disko
      inputs.home-manager.nixosModules.home-manager
      config.flake.modules.nixos.be
      {
        home-manager.useGlobalPkgs = true;
        home-manager.useUserPackages = true;
      }
    ];
  };
}
