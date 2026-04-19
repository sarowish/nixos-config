{ pkgs, ... }:

{
  imports = [
    ./hardware-configuration.nix
    ./disk-config.nix
    ./boot.nix
    ./docs.nix
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

  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 15d";
  };
  nix.extraOptions = ''
    min-free = ${toString (1024 * 1024 * 1024)}
    max-free = ${toString (8 * 1024 * 1024 * 1024)}
  '';

  programs.steam.enable = true;
  programs.hyprland.enable = true;
  services.hardware.openrgb.enable = true;

  zramSwap = {
    enable = true;
    algorithm = "zstd";
    memoryPercent = 100;
  };

  hardware.openrazer = {
    enable = true;

    batteryNotifier = {
      frequency = 3600;
      percentage = 7;
    };
  };

  programs.virt-manager.enable = true;
  users.groups.libvirtd.members = [ "chels" ];
  virtualisation.libvirtd = {
    enable = true;
    qemu.vhostUserPackages = [ pkgs.virtiofsd ];
  };

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
    ffmpeg
    zip
    unzip
    cachix
  ];
}
