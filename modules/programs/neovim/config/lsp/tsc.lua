local typescript = require('lsp.typescript')

return {
    cmd = function(dispatchers, config)
        return vim.lsp.rpc.start(assert(typescript.native_cmd(config.root_dir)), dispatchers)
    end,
    filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
    root_dir = function(bufnr, on_dir)
        local root = typescript.root(bufnr)
        if typescript.native_cmd(root) then
            on_dir(root)
        end
    end,
    -- The shared LSP mappings construct positions using UTF-16.
    capabilities = require('blink.cmp').get_lsp_capabilities({ general = { positionEncodings = { 'utf-16' } } }),
    settings = {
        ['js/ts'] = {
            inlayHints = {
                parameterNames = { enabled = 'literals' },
                parameterTypes = { enabled = true },
                variableTypes = { enabled = true },
                propertyDeclarationTypes = { enabled = true },
                functionLikeReturnTypes = { enabled = true },
                enumMemberValues = { enabled = true },
            },
        },
    },
    on_attach = typescript.on_attach,
}
