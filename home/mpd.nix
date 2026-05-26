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
    settings = {
      scrobbling.lastfm = {
        enable = true;
        api_key = "f29aa97582fb204d125eeaa93df2ea5d";
        secret = "ae86e05c49bafbd7c4a3d017ed192bb5";
      };
    };
  };
}
