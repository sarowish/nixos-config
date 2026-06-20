{ pkgs, inputs, ... }:
{
  home.packages = [
    inputs.helium.packages.${pkgs.stdenv.hostPlatform.system}.default
  ];

  xdg.desktopEntries = {
    helium = {
      name = "Helium";
      genericName = "Web Browser";
      exec = "helium %U";
      terminal = false;
      categories = [
        "Network"
        "WebBrowser"
      ];
      mimeType = [
        "text/html"
        "text/xml"
      ];
    };
  };
}
