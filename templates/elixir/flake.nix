{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        beamPackages = pkgs.beamMinimal29Packages;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with beamPackages; [
            elixir_1_20
            expert
            hex
            rebar3
          ];
        };
      }
    );
}
