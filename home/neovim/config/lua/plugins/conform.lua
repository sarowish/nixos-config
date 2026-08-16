return {
    'stevearc/conform.nvim',
    keys = {
        { '<leader>cf', function() require('conform').format({ async = true, lsp_format = "fallback" }) end },
    },
    opts = {
        formatters_by_ft = {
            python = { "ruff_format", "ruff_organize_imports" },
            javascript = { "prettier" },
            svelte = { "prettier" },
            html = { "prettier" },
        }
    },
}
