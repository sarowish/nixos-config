{ config, ... }:
{
  programs.beets = {
    enable = true;

    settings = {
      library = "${config.xdg.stateHome}/beets/library.db";

      plugins = [
        "fetchart"
        "fromfilename"
        "chroma"
        "autobpm"
      ];

      fetchart.sources = [
        "coverart"
        "itunes"
        "amazon"
        "albumart"
      ];
      autobpm.auto = false;
    };
  };
}
