local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/folke/trouble.nvim",
}, function()
    require("trouble").setup({
        use_diagnostic_signs = true
    })
end)

plugin:on_command({
    { 'Trouble' },
})
