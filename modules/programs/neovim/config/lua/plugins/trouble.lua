return {
    "folke/trouble.nvim",
    cmd = 'Trouble',
    keys = {
        -- { "<leader>ll", "<cmd>Trouble<cr>" },
        -- { "<leader>lc", "<cmd>TroubleClose<cr>" },
        -- { "<leader>lw", "<cmd>Trouble lsp_workspace_diagnostics<cr>" },
        -- { "<leader>ld", "<cmd>Trouble lsp_document_diagnostics<cr>" },
        -- { "gR",         "<cmd>Trouble lsp_references<cr>" },
    },
    opts = {
        use_diagnostic_signs = true
    }
}
