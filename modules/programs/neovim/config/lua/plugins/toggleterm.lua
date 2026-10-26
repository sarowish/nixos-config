local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/akinsho/toggleterm.nvim",
}, function()
    require("toggleterm").setup({
        open_mapping = [[<A-t>]],
        direction = "float",
        size = 20
    })
end)

plugin:on({
    commands = {
        { 'ToggleTerm', { count = true } },
    },
    keys = {
        { 'n', '<A-t>' },
        { 'n', '<leader>td', function() require('toggleterm').toggle(0, nil, nil, 'float') end },
        { 'n', '<leader>ts', function() require('toggleterm').toggle(0, nil, nil, 'horizontal') end },
        { 'n', '<leader>ta', function() require('toggleterm').toggle(0, 80, nil, 'vertical') end },
    },
})
