return {
    "romus204/tree-sitter-manager.nvim",
    dependencies = {},
    config = function()
        require("tree-sitter-manager").setup({
            ensure_installed = {
                "bash",
                "c",
                "cpp",
                "nu",
                "rust",
                "python",
                "fish",
                "toml",
                "yaml",
                "hyprlang",
                "nix",
                "javascript",
                "typescript",
                "tsx",
                "elixir",
                "eex",
                "heex",
                "ocaml",
                "svelte",
                "html",
                "css"
            }
        })
    end
}
