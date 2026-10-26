local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/smoka7/hop.nvim",
}, function()
    require("hop").setup({
        multi_windows = true,
        keys = "eriqysntvjluoxfdhwzgpmbkac"
    })
end)

plugin:on_key({
    { '',  '<leader>l', function() require('hop').hint_words() end },
    { 'n', '<leader>/', function() require('hop').hint_patterns() end },
    { '',  '<leader>f', function() require('hop').hint_char1() end },
    { '',  '<leader>s', function() require('hop').hint_lines_skip_whitespace() end },
})
