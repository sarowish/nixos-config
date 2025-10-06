return {
    'kyazdani42/nvim-tree.lua',
    cmd = { "NvimTreeToggle", "NvimTreeFocus" },
    keys = { { '<A-tab>', "<cmd>NvimTreeToggle<cr>", mode = 'n' } },
    opts = {
        disable_netrw = true,
        diagnostics = {
            enable = true,
            show_on_dirs = true,
        },
        renderer = {
            highlight_opened_files = 'name',
            indent_markers = {
                enable = true,
            },
        }
    },
}
