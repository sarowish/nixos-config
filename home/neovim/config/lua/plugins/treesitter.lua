return {
    'nvim-treesitter/nvim-treesitter',
    opts = {
        highlight = {
            enable = true,
        },
        query_linter = {
            enable = true,
            use_virtual_text = true,
            lint_events = { "BufWrite", "CursorHold" },
        }
    },
    config = function(_, opts)
        require('nvim-treesitter.configs').setup(opts)
    end
}
