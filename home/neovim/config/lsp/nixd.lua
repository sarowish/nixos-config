return {
    cmd = { 'nixd' },
    root_markers = { 'flake.nix' },
    filetypes = { 'nix' },
    settings = {
        nixd = {
            formatting = {
                command = { 'nixfmt' }
            },
            options = {
                nixos = {
                    expr = '(builtins.getFlake "/home/chels/nixos-config").nixosConfigurations.be.options'
                },
                home_manager = {
                    expr = '(builtins.getFlake "/home/chels/nixos-config").nixosConfigurations.be.options.home-manager.users.type.getSubOptions []'
                }
            }
        }
    }
}
