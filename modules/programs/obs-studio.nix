{
  flake.modules.homeManager.obs-studio =
    { pkgs, ... }:
    {
      programs.obs-studio = {
        enable = true;
        package = pkgs.obs-studio.override {
          cudaSupport = true;
        };
        plugins = [ pkgs.obs-studio-plugins.obs-pipewire-audio-capture ];
      };
    };
}
