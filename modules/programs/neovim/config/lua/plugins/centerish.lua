return
{
    "sarowish/centerish.nvim",
    keys = { { '<leader>n', function() require('centerish').toggle() end, mode = 'n' } },
    opts = {
        width = 120,
        min_padding_width = 20,
        sidebars = {
            ["codediff-explorer"] = "left"
        },
    },
}
