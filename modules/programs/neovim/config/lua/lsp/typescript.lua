local M = {}

function M.root(bufnr)
    local root = vim.fs.root(bufnr, 'tsconfig.json')
        or vim.fs.root(bufnr, { 'jsconfig.json', 'package.json', '.git' })
        or vim.fn.getcwd()
    return root:match('^(.-)/node_modules/') or root
end

function M.native_cmd(root)
    local dir = root
    while dir do
        local path = dir .. '/node_modules/typescript'
        local file = io.open(path .. '/package.json', 'r')
        if file then
            local ok, pkg = pcall(vim.json.decode, file:read('*a'))
            file:close()
            local major = ok and type(pkg) == 'table' and tonumber(tostring(pkg.version):match('^(%d+)'))
            if major and major >= 7 then
                return { 'node', path .. '/lib/tsc.js', '--lsp', '--stdio' }
            end
            -- A nearer installation takes precedence over a hoisted one.
            return
        end
        local parent = vim.fs.dirname(dir)
        if parent == dir then
            return
        end
        dir = parent
    end
end

function M.on_attach(_, bufnr)
    -- Include import and cleanup actions alongside quick fixes and refactors.
    vim.keymap.set({ 'n', 'x' }, 'ga', function()
        vim.lsp.buf.code_action({ context = { only = { 'quickfix', 'refactor', 'source' } } })
    end, { buffer = bufnr, desc = 'LSP: Code Action' })
end

return M
