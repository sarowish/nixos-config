local loader = require('plugin_loader')

local insert_plugins = loader.defer({
    "https://github.com/windwp/nvim-autopairs",
    "https://github.com/rafamadriz/friendly-snippets",
    "https://github.com/L3MON4D3/LuaSnip",
}, function()
    require("nvim-autopairs").setup({})
    require("luasnip.loaders.from_vscode").lazy_load()
end)

insert_plugins:on_event({
    { 'InsertEnter' },
})

local which_key = loader.defer({ "https://github.com/folke/which-key.nvim" })

which_key:on_event({
    { 'VimEnter' },
}, { schedule = true })
