{
  flake.modules.nixos.packages =
    { pkgs, ... }:
    {
      programs.nano.enable = false;
      environment.variables.PAGER = null;
      environment.systemPackages = with pkgs; [
        openrazer-daemon
        nicotine-plus
        killall
        wget
        ripgrep
        eza
        dust
        file
        xh
        nixfmt
        gcc
        tokei
        onefetch
        ffmpeg
        zip
        unzip
        cachix
        jless
        android-tools
      ];
    };
}
