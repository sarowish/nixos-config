vim.g['mapleader'] = ' '
vim.g['maplocalleader'] = ' '

local opt = vim.opt

opt.startofline = true
opt.timeoutlen = 300
opt.updatetime = 300
opt.showmode = false
opt.termguicolors = true
opt.ignorecase = true
opt.smartcase = true
opt.splitbelow = true
opt.splitright = true
opt.scrolloff = 1
opt.clipboard:append { 'unnamedplus' }
opt.mouse = 'a'
opt.hidden = true
opt.backup = false
opt.writebackup = false
opt.wildmode = { "longest", "list", "full" }
opt.completeopt:append { "menuone", "noinsert", "noselect" }
opt.shortmess:append('c')
opt.smoothscroll = true
opt.virtualedit = "block"
opt.laststatus = 3
opt.expandtab = true
opt.softtabstop = 4
opt.shiftwidth = 4
opt.tabstop = 4
opt.number = true
opt.relativenumber = true
opt.cursorline = true

vim.api.nvim_create_autocmd("BufEnter", {
    callback = function()
        opt.formatoptions:remove { 'o' }
    end
})

local disabled_built_ins = {
    "netrw",
    "netrwPlugin",
    "netrwSettings",
    "netrwFileHandlers",
    "gzip",
    "zip",
    "zipPlugin",
    "tar",
    "tarPlugin",
    "getscript",
    "getscriptPlugin",
    "vimball",
    "vimballPlugin",
    "2html_plugin",
    "logipat",
    "rrhelper",
    "spellfile_plugin",
    "matchit"
}

for _, plugin in pairs(disabled_built_ins) do
    vim.g["loaded_" .. plugin] = 1
end
