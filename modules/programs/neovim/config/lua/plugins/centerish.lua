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
    })
end)

plugin:on_key({
    { 'n', '<leader>n', function() require('centerish').toggle() end },
})
