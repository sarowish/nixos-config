{ inputs, ... }:
let
  extraPackagesFor =
    system:
    let
      pkgs = inputs.nixpkgs.legacyPackages.${system};
    in
    with inputs.ags.packages.${system};
    [
      wireplumber
      tray
      pkgs.mpc
      inputs.niri-pkgs.packages.${system}.niri-unstable
    ];
in
{
  flake.devShells.x86_64-linux.ags =
    let
      pkgs = inputs.nixpkgs.legacyPackages.x86_64-linux;
      ags = inputs.ags.packages.x86_64-linux.default.override {
        extraPackages = extraPackagesFor "x86_64-linux";
      };
      declarations =
        pkgs.runCommand "ags-type-declarations"
          {
            nativeBuildInputs = [ pkgs.typescript ];
          }
          ''
            cp -r ${ags.jsPackage}/lib ags
            cp -r ${ags.jsPackage}/node_modules/gnim/dist gnim
            shopt -s globstar
            tsc --noCheck --declaration --emitDeclarationOnly \
              --target ES2022 --module ES2022 --moduleResolution bundler \
              --rootDir . --outDir "$out" ags/**/*.ts gnim/**/*.ts
          '';
    in
    pkgs.mkShell {
      packages = [
        ags
        pkgs.nodejs
        pkgs.typescript
        pkgs.typescript-language-server
        pkgs.prettier
      ];
      AGS_TYPES = declarations;
    };

  flake.modules.homeManager.ags =
    { config, pkgs, ... }:
    {
      imports = [ inputs.ags.homeManagerModules.default ];

      xdg.configFile."ags-theme.css".text = ''
        @define-color accent #${config.colors.accent};
      '';

      programs.ags = {
        enable = true;
        systemd.enable = true;

        configDir = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/nixos-config/modules/programs/ags/config";

        extraPackages = extraPackagesFor pkgs.stdenv.hostPlatform.system;
      };

      systemd.user.services.ags = {
        Unit.ConditionEnvironment = "NIRI_SOCKET";
      };
    };
}
