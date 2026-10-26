local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/stevearc/conform.nvim",
}, function()
    require("conform").setup({
        formatters_by_ft = {
            elixir = { "mix" },
            eelixir = { "mix" },
            heex = { "mix" },
            python = { "ruff_format", "ruff_organize_imports" },
            javascript = { "prettier" },
            svelte = { "prettier" },
            html = { "prettier" },
        }
    })
end)

plugin:on_key({
    { 'n', '<leader>cf', function()
        require('conform').format({ async = true, lsp_format = 'fallback' })
    end },
})
