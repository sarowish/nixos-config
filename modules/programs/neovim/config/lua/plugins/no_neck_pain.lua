return
{
    "shortcuts/no-neck-pain.nvim",
    keys = { { '<leader>n', function() require('no-neck-pain').toggle() end, mode = 'n' } },
    opts = {
        width = 150,
        minSideBufferWidth = 20,
        buffers = {
            wo = { fillchars = "eob: " } },
        autocmds = {
            skipEnteringNoNeckPainBuffer = true,
        }

    },
}
