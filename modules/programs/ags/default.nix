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
    {
      config,
      lib,
      pkgs,
      ...
    }:
    {
      imports = [ inputs.ags.homeManagerModules.default ];

      xdg.configFile."ags-theme.css".text = ''
        @define-color accent #${config.colors.accent};
        @define-color background #${config.colors.background};
        @define-color foreground #${config.colors.foreground};
        @define-color urgent #${config.colors.yellow};
      '';

      xdg.configFile."ags-style.css".source =
        let
          styles = lib.fileset.toSource {
            root = ./config;
            fileset = lib.fileset.fileFilter (file: file.hasExt "scss" || file.hasExt "css") ./config;
          };
        in
        pkgs.runCommand "ags-style.css" { nativeBuildInputs = [ pkgs.dart-sass ]; } ''
          sass --no-source-map ${styles}/style.scss > "$out"
          cat ${config.xdg.configFile."ags-theme.css".source} >> "$out"
        '';

      programs.ags = {
        enable = true;
        systemd.enable = true;

        configDir = config.lib.file.mkOutOfStoreSymlink "${config.home.homeDirectory}/nixos-config/modules/programs/ags/config";

        extraPackages = extraPackagesFor pkgs.stdenv.hostPlatform.system;
      };

      systemd.user.services.ags = {
        Unit = {
          After = [ "niri.service" ];
          ConditionEnvironment = "NIRI_SOCKET";
          X-Restart-Triggers = [
            (lib.fileset.toSource {
              root = ./config;
              fileset = lib.fileset.fileFilter (file: !(file.hasExt "scss" || file.hasExt "css")) ./config;
            })
          ];
          X-Reload-Triggers = [ config.xdg.configFile."ags-style.css".source ];
        };
        Service.ExecReload = "${config.programs.ags.finalPackage}/bin/ags request reload-css";
      };
    };
}
