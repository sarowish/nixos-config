{ config, ... }:
{
  programs.beets = {
    enable = true;

    settings = {
      library = "${config.xdg.stateHome}/beets/library.db";
      paths.default = "$albumartist/[$original_year] $album%aunique{}/$track $title";

      plugins = [
        "fetchart"
        "fromfilename"
        "chroma"
        "autobpm"
        "musicbrainz"
        "mpdupdate"
      ];

      fetchart.sources = [
        "filesystem"
        "coverart"
        "itunes"
        "amazon"
        "albumart"
      ];
      autobpm.auto = false;
    };
  };
}
