local loader = require('plugin_loader')

vim.g.barbar_auto_setup = false

local plugin = loader.defer({
    "https://github.com/nvim-tree/nvim-web-devicons",
    "https://github.com/romgrk/barbar.nvim",
})
plugin.load()

local opts = {
    auto_hide = true,
    exclude_name = { "" },
    icons = {
        button = '✖'
    },
}

require("barbar").setup(opts)

local set = vim.keymap.set
set('n', '<C-s>', ':BufferPick<CR>', { silent = true })
set('n', '<A-,>', ':BufferPrevious<CR>', { silent = true })
set('n', '<A-.>', ':BufferNext<CR>', { silent = true })
set('n', '<A-1>', ':BufferGoto 1<CR>', { silent = true })
set('n', '<A-2>', ':BufferGoto 2<CR>', { silent = true })
set('n', '<A-3>', ':BufferGoto 3<CR>', { silent = true })
set('n', '<A-4>', ':BufferGoto 4<CR>', { silent = true })
set('n', '<A-5>', ':BufferGoto 5<CR>', { silent = true })
set('n', '<A-6>', ':BufferGoto 6<CR>', { silent = true })
set('n', '<A-7>', ':BufferGoto 7<CR>', { silent = true })
set('n', '<A-8>', ':BufferGoto 8<CR>', { silent = true })
set('n', '<A-9>', ':BufferGoto 9<CR>', { silent = true })
set('n', '<A-c>', ':BufferClose<CR>', { silent = true })
