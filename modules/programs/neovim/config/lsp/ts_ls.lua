return {
    cmd = { 'typescript-language-server', '--stdio' },
    filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
    root_dir = function(bufnr, on_dir)
        local root = vim.fs.root(bufnr, 'tsconfig.json')
            or vim.fs.root(bufnr, { 'jsconfig.json', 'package.json', '.git' })
            or vim.fn.getcwd()
        on_dir(root:match('^(.-)/node_modules/') or root)
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
    on_attach = function(_, bufnr)
        -- Include import and cleanup actions alongside quick fixes and refactors.
        vim.keymap.set({ 'n', 'x' }, 'ga', function()
            vim.lsp.buf.code_action({ context = { only = { 'quickfix', 'refactor', 'source' } } })
        end, { buffer = bufnr, desc = 'LSP: Code Action' })
    end,
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
