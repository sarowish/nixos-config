local show_toc = function()
    local utils = require('utils')
    require('vim.treesitter._headings').show_toc()
    vim.cmd.lclose()
    utils.show_toc()
end

vim.keymap.set("n", "<leader>o", show_toc, { buffer = 0 })
