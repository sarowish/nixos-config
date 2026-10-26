local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/karb94/neoscroll.nvim",
}, function()
    require("neoscroll").setup({
        hide_cursor = false,
        easing_function = "quadratic",
        ignored_events = { "CursorMoved" },
    })
end)

plugin:on_key({
    { 'n', { '<C-u>', '<C-d>', '<C-b>', '<C-f>', '<C-y>', '<C-e>', 'zt', 'zz', 'zb' } },
})
