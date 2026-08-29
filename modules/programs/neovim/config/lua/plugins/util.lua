return {
    { 'nvim-lua/plenary.nvim',       lazy = true },
    { 'kyazdani42/nvim-web-devicons' },
    { "folke/which-key.nvim",        event = "VeryLazy" },
    { 'windwp/nvim-autopairs',       event = 'InsertEnter', config = true },
    {
        'L3MON4D3/LuaSnip',
        dependencies = { "rafamadriz/friendly-snippets" },
        event = 'InsertEnter',
        config = function()
            require("luasnip.loaders.from_vscode").lazy_load()
        end
    },
}
