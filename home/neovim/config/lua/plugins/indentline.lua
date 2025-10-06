return {
    'lukas-reineke/indent-blankline.nvim',
    opts = {
        exclude = { filetypes = { 'text' } },
        indent = {
            char = '¦'
        }
    },
    config = function(_, opts)
        require('ibl').setup(opts)

        local hooks = require "ibl.hooks"
        hooks.register(
            hooks.type.WHITESPACE,
            hooks.builtin.hide_first_space_indent_level
        )
    end,
}
