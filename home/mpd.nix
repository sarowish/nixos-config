{
  inputs,
  pkgs,
  config,
  ...
}:
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

  services.mpd-notify = {
    enable = true;
    package = inputs.mpd-notify.packages.${pkgs.stdenv.hostPlatform.system}.default;
  };
}
