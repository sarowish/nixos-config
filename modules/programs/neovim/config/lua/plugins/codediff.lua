local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/esmuellert/codediff.nvim",
}, function()
    require("codediff").setup({
        diff = {
            compact = true,
            cycle_hunks_across_files = true,
        },
        explorer = {
            focus_on_select = true,
            line_stats = {
                enabled = true,
                count_untracked = true,
            },
        },
    })
end)

plugin:on({
    commands = {
        { 'CodeDiff', { bang = true, range = true } },
    },
    keys = {
        { 'n', '<leader>gv', '<cmd>CodeDiff<cr>',                { desc = 'Review current changes' } },
        { 'n', '<leader>gV', '<cmd>CodeDiff origin/main...<cr>', { desc = 'Review changes against origin/main' } },
    },
})
