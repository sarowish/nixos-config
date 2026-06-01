{
  inputs,
  pkgs,
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

  services.mpd-herald = {
    enable = true;
    package = inputs.mpd-herald.packages.${pkgs.stdenv.hostPlatform.system}.default;
  };
}
