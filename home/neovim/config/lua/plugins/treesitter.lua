return {
    "romus204/tree-sitter-manager.nvim",
    dependencies = {},
    config = function()
        require("tree-sitter-manager").setup({
            ensure_installed = { "bash", "rust", "python", "fish", "toml", "hyprlang", "nix" },
        })
    end
}
