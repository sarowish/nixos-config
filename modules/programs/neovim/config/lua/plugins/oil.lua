local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/nvim-tree/nvim-web-devicons",
    "https://github.com/stevearc/oil.nvim",
}, function()
    require("oil").setup({})
end)

plugin:on({
    commands = {
        { 'Oil', { count = true } },
    },
    keys = {
        { 'n', '<leader>e', function() require('oil').open() end },
    },
})
