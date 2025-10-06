local set = vim.keymap.set

vim.g.rustaceanvim = {
    server = {
        on_attach = function(_, bufnr)
            set("n", "J", function() vim.cmd.RustLsp('joinLines') end, { silent = true, buffer = bufnr })
            set("n", "<leader>re", function() vim.cmd.RustLsp('explainError') end, { silent = true, buffer = bufnr })
            set("n", "<leader>rd", function() vim.cmd.RustLsp('renderDiagnostic') end, { silent = true, buffer = bufnr })
            set("n", "<leader>rr", function() vim.cmd.RustLsp('relatedDiagnostics') end,
                { silent = true, buffer = bufnr })
            set("n", "<leader>rc", function() vim.cmd.RustLsp('openCargo') end, { silent = true, buffer = bufnr })
            set("n", "<leader>ro", function() vim.cmd.RustLsp('openDocs') end, { silent = true, buffer = bufnr })
            set("n", "<leader>ro", function() vim.cmd.RustLsp('openDocs') end, { silent = true, buffer = bufnr })
        end,
    },
}

return {
    'mrcjkb/rustaceanvim',
    lazy = false,
}
