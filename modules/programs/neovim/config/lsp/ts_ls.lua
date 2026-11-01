local typescript = require('lsp.typescript')

return {
    cmd = { 'typescript-language-server', '--stdio' },
    filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
    root_dir = function(bufnr, on_dir)
        local root = typescript.root(bufnr)
        if not typescript.native_cmd(root) then
            on_dir(root)
        end
    end,
    capabilities = require('blink.cmp').get_lsp_capabilities(),
    init_options = {
        hostInfo = 'neovim',
        preferences = {
            includeInlayParameterNameHints = 'literals',
            includeInlayFunctionParameterTypeHints = true,
            includeInlayVariableTypeHints = true,
            includeInlayPropertyDeclarationTypeHints = true,
            includeInlayFunctionLikeReturnTypeHints = true,
            includeInlayEnumMemberValueHints = true,
        },
    },
    settings = {
        completions = { completeFunctionCalls = true },
    },
    on_attach = typescript.on_attach,
    handlers = {
        ['_typescript.rename'] = function(_, params, ctx)
            local client = assert(vim.lsp.get_client_by_id(ctx.client_id))
            vim.lsp.util.show_document({
                uri = params.textDocument.uri,
                range = { start = params.position, ['end'] = params.position },
            }, client.offset_encoding)
            vim.lsp.buf.rename()
            return vim.NIL
        end,
    },
}
