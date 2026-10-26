local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/nvim-lua/plenary.nvim",
    "https://github.com/pmizio/typescript-tools.nvim",
}, function()
    require('plugins.cmp')
    require("typescript-tools").setup({
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
    })
end)

plugin:on_event({
    { 'FileType', { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' } },
})
