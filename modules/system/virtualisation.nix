{
  flake.modules.nixos.virtualisation =
    { pkgs, ... }:
    {
      programs.virt-manager.enable = true;
      users.groups.libvirtd.members = [ "chels" ];
      virtualisation.libvirtd = {
        enable = true;
        qemu.vhostUserPackages = [ pkgs.virtiofsd ];
      };
    };
}
