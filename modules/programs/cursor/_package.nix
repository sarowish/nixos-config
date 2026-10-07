{
  lib,
  stdenvNoCC,
  bibata-cursors,
  clickgen,
  resvg,
  themeName,
  colors,
}:

stdenvNoCC.mkDerivation {
  pname = "bibata-cursors-custom";
  inherit (bibata-cursors) src version;

  nativeBuildInputs = [
    resvg
    clickgen
  ];

  buildPhase = ''
    runHook preBuild

    mkdir bitmaps

    while IFS= read -r -d $'\0' svg; do
      sed \
        -e ${lib.escapeShellArg "s/#00FF00/${colors.base}/gi"} \
        -e ${lib.escapeShellArg "s/#0000FF/${colors.outline}/gi"} \
        -e ${lib.escapeShellArg "s/#FF0000/${colors.watch}/gi"} \
        "$svg" > recolored.svg
      resvg recolored.svg "bitmaps/$(basename "$svg" .svg).png"
    done < <(find -L svg/modern -type f -name '*.svg' -print0)

    ctgen configs/normal/x.build.toml -p x11 -d bitmaps \
      -n ${lib.escapeShellArg themeName} -c 'Custom-colored Bibata modern cursors'

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/share/icons"
    cp -a ${lib.escapeShellArg "themes/${themeName}"} "$out/share/icons/"

    runHook postInstall
  '';

  meta = bibata-cursors.meta // {
    description = "Bibata modern cursors with custom colors";
  };
}
