local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/nvim-lua/plenary.nvim",
    "https://github.com/nvim-telescope/telescope.nvim",
}, function()
    require("telescope").setup({
        defaults = {
            sorting_strategy = "ascending",
            layout_config = {
                width = 0.75,
                prompt_position = "top",
                preview_cutoff = 120,
            },
        }
    })
end)

plugin:on({
    commands = {
        { 'Telescope' },
    },
    keys = {
        { 'n', '<leader><tab>',         function() require('telescope.builtin').find_files() end },
        { 'n', '<leader><leader><tab>', function() require('telescope.builtin').buffers() end },
        { 'n', '<leader><leader>r',     function() require('telescope.builtin').resume() end },
        { 'n', '<leader><leader>l',     function() require('telescope.builtin').live_grep() end },
        { 'n', '<leader><leader>b',     function() require('telescope.builtin').builtin() end },
        { 'n', '<leader><leader>s',     function() require('telescope.builtin').lsp_document_symbols() end },
        { 'n', '<leader><leader>w',     function() require('telescope.builtin').lsp_workspace_symbols() end },
    },
})

return plugin
