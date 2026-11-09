local loader = require('plugin_loader')

-- Parsers must match the plugin's pinned revisions, so rebuild them after every update.
vim.api.nvim_create_autocmd('PackChanged', {
    group = vim.api.nvim_create_augroup('treesitter-update', { clear = true }),
    callback = function(ev)
        local data = ev.data
        if data.spec.name ~= 'nvim-treesitter' or data.kind ~= 'update' then return end
        if not data.active then vim.cmd.packadd('nvim-treesitter') end
        vim.cmd('TSUpdate')
    end,
})

local plugin = loader.defer({
    { src = "https://github.com/nvim-treesitter/nvim-treesitter", version = 'main' },
})
plugin.load()

-- No-op for parsers that are already installed.
require('nvim-treesitter').install({
    "bash",
    "c",
    "cpp",
    "nu",
    "rust",
    "python",
    "fish",
    "toml",
    "yaml",
    "hyprlang",
    "nix",
    "javascript",
    "typescript",
    "tsx",
    "elixir",
    "eex",
    "heex",
    "ocaml",
    "svelte",
    "html",
    "css",
    "just",
})

-- Highlight every buffer whose filetype has an installed parser.
vim.api.nvim_create_autocmd('FileType', {
    group = vim.api.nvim_create_augroup('treesitter-start', { clear = true }),
    callback = function(ev) pcall(vim.treesitter.start, ev.buf) end,
})
