local show_toc = function()
    local utils = require('utils')
    require('man').show_toc()
    vim.cmd.lclose()
    utils.show_toc()
end


if vim.g.pager then
    vim.opt.cmdheight = 0
end

vim.keymap.set("n", "<leader>o", show_toc, { buffer = 0 })
