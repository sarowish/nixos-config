local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/lukas-reineke/indent-blankline.nvim",
})
plugin.load()

local opts = {
    exclude = { filetypes = { 'text' } },
    indent = {
        char = '¦'
    }
}

require('ibl').setup(opts)

local hooks = require "ibl.hooks"
hooks.register(
    hooks.type.WHITESPACE,
    hooks.builtin.hide_first_space_indent_level
)
