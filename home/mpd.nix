{ pkgs, config, ... }:
{
  home.packages = with pkgs; [
    mpc
    euphonica
  ];

  services.mpd = {
    enable = true;
    extraConfig = ''
      audio_output {
          type "pipewire"
          name "Pipewire Output"
      }
    '';
  };

  services.mpdscribble = {
    enable = true;
    endpoints."last.fm" = {
      username = "cuttxo";
      passwordFile = config.sops.secrets.last_fm.path;
    };
  };

  services.mpd-discord-rpc = {
    enable = true;
    settings = {
      format = {
        details = "$title";
        state = "$artist";
        large_text = "$album";
        small_image = "";
      };
    };
  };
}
