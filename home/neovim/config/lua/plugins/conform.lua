return {
    'stevearc/conform.nvim',
    keys = {
        { '<leader>cf', function() require('conform').format({ async = true, lsp_format = "fallback" }) end },
    },
    opts = {
        formatters_by_ft = {
            python = { "black" },
            javascript = { "prettier" }
        }
    },
}
