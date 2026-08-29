return {
    'nvim-telescope/telescope.nvim',
    dependencies = { 'nvim-lua/plenary.nvim' },
    cmd = 'Telescope',
    keys = {
        { '<leader><tab>',         function() require('telescope.builtin').find_files() end },
        { '<leader><leader><tab>', function() require('telescope.builtin').buffers() end },
        { '<leader><leader>r',     function() require('telescope.builtin').resume() end },
        { '<leader><leader>l',     function() require('telescope.builtin').live_grep() end },
        { '<leader><leader>b',     function() require('telescope.builtin').builtin() end },
        { '<leader><leader>s',     function() require('telescope.builtin').lsp_document_symbols() end },
        { '<leader><leader>w',     function() require('telescope.builtin').lsp_workspace_symbols() end },
    },
    opts = {
        defaults = {
            sorting_strategy = "ascending",
            layout_config = {
                width = 0.75,
                prompt_position = "top",
                preview_cutoff = 120,
            },
        }
    }
}
