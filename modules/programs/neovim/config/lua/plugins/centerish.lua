local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/sarowish/centerish.nvim",
}, function()
    require("centerish").setup({
        width = 120,
        min_padding_width = 20,
        sidebars = {
            ["codediff-explorer"] = "left"
        },
        autocmds = {
            enable_on_startup = "immediate",
            enable_on_tab = "immediate",
        },

    })
end)
plugin.load()

vim.keymap.set('n', '<leader>n', function() require('centerish').toggle() end)
