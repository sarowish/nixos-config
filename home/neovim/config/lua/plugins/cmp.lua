local has_words_before = function()
    local col = vim.api.nvim_win_get_cursor(0)[2]
    if col == 0 then
        return false
    end
    local line = vim.api.nvim_get_current_line()
    return line:sub(col, col):match("%s") == nil
end

return {
    {
        'saghen/blink.cmp',

        version = '1.*',

        ---@module 'blink.cmp'
        ---@type blink.cmp.Config
        opts = {
            keymap = {
                preset = 'none',
                ['<Tab>'] = {
                    function(cmp)
                        if has_words_before() then
                            return cmp.select_next()
                        end
                    end,
                    'snippet_forward',
                    'fallback',
                },
                ['<S-Tab>'] = { 'select_prev', "snippet_backward" },
                ['<CR>'] = { 'accept', 'fallback' },
                ['<C-u>'] = { 'scroll_documentation_up' },
                ['<C-d>'] = { 'scroll_documentation_down' },
                ['<C-space>'] = { 'show', 'hide_documentation', 'show_documentation' },
                ['<C-e>'] = { 'hide' },
                ['<Esc>'] = { 'cancel', 'fallback' },
            },

            appearance = {
                nerd_font_variant = 'mono'
            },

            completion = {
                documentation = {
                    auto_show = true,
                    auto_show_delay_ms = 50,
                    window = {
                        max_height = 40,
                        border = 'rounded'
                    }
                },
                list = { selection = { preselect = false } },
                ghost_text = { enabled = true },
                menu = {
                    border = 'rounded',
                    draw = {
                        columns = { { 'kind_icon' }, { 'label' }, { 'kind' }, { 'label_description' } },
                        components = {
                            label = {
                                text = function(ctx)
                                    return require("colorful-menu").blink_components_text(ctx)
                                end,
                                highlight = function(ctx)
                                    return require("colorful-menu").blink_components_highlight(ctx)
                                end,
                            },
                        },
                    }
                }
            },
            snippets = { preset = "luasnip" },
            sources = {
                default = { 'lsp', 'path', 'snippets', 'buffer' },
            },
            fuzzy = {
                implementation = "prefer_rust_with_warning"
            },
        },
        opts_extend = { "sources.default" }
    },
    { 'xzbdmw/colorful-menu.nvim' }
}
