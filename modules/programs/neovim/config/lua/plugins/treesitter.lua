local loader = require('plugin_loader')

local plugin = loader.defer({
    "https://github.com/romus204/tree-sitter-manager.nvim",
})
plugin.load()

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
