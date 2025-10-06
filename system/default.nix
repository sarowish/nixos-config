{ pkgs, ... }:

{
  imports = [
    ./hardware-configuration.nix
    ./disk-config.nix
    ./boot.nix
    ./network.nix
    ./sound.nix
    ./graphics.nix
    ./fonts.nix
    ./greetd.nix
    ./keyboard.nix
  ];

  users.users.chels = {
    isNormalUser = true;
    extraGroups = [
      "wheel"
      "openrazer"
    ];
  };

  time.timeZone = "Europe/Istanbul";

  nix.settings.experimental-features = [
    "nix-command"
    "flakes"
  ];
  nixpkgs.config.allowUnfree = true;
  system.stateVersion = "25.05";

  programs.steam.enable = true;
  programs.hyprland.enable = true;
  services.hardware.openrgb.enable = true;

  zramSwap = {
    enable = true;
    algorithm = "zstd";
    memoryPercent = 50;
  };

  hardware.openrazer = {
    enable = true;

    batteryNotifier = {
      frequency = 3600;
      percentage = 10;
    };
  };

  programs.virt-manager.enable = true;
  users.groups.libvirtd.members = [ "chels" ];
  virtualisation.libvirtd.enable = true;

  security.sudo.extraConfig = "Defaults pwfeedback";

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
  ];
}
