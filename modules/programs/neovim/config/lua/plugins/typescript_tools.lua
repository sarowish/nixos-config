return {
    "pmizio/typescript-tools.nvim",

    ft = {
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact",
    },

    dependencies = {
        "nvim-lua/plenary.nvim",
    },

    opts = function()
        return {
            capabilities = require("blink.cmp").get_lsp_capabilities(),

            settings = {
                expose_as_code_action = "all",
                complete_function_calls = true,

                tsserver_file_preferences = {
                    includeInlayParameterNameHints = "literals",
                    includeInlayFunctionParameterTypeHints = true,
                    includeInlayVariableTypeHints = true,
                    includeInlayPropertyDeclarationTypeHints = true,
                    includeInlayFunctionLikeReturnTypeHints = true,
                    includeInlayEnumMemberValueHints = true,
                },
            },
        }
    end,
}
