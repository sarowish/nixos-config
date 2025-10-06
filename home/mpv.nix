{
  programs.mpv = {
    enable = true;

    config = {
      osd-font = "Cantarell";
      osd-font-size = 55;
      osd-scale = 0.5;
      sub-scale = 0.65;
      secondary-sub-pos = 8;

      save-position-on-quit = "yes";
      keep-open = "yes";
    };

    bindings = {
      h = "seek -5";
      l = "seek 5";
      j = "seek -10";
      k = "seek 10";

      "CTRL+j" = "cycle sub";
      "CTRL+J" = "cycle sub down";
      "ALT+j" = "cycle secondary-sid";
      "ALT+J" = "cycle secondary-sid down";
    };
  };
}
