return {
    'saecki/crates.nvim',
    event = 'BufRead Cargo.toml',
    opts = {
        lsp = {
            enabled = true,
            actions = true,
            completion = true,
            hover = true,
        },
        completion = {
            crates = {
                enabled = true,
                max_results = 8,
                min_chard = 3,
            }
        }

    },
    config = function(_, opts)
        local crates = require("crates")
        crates.setup(opts)

        local map = function(keys, func, desc, mode)
            mode = mode or 'n'
            vim.keymap.set(mode, keys, func, { buffer = 0, desc = 'Crates: ' .. desc })
        end

        map("<leader>ct", crates.toggle, "Toggle")
        map("<leader>cr", crates.reload, "Reload")

        map("<leader>cv", crates.show_versions_popup, "Show Versions Popup")
        map("<leader>cf", crates.show_features_popup, "Show Features Popup")
        map("<leader>cd", crates.show_dependencies_popup, "Show Dependencies Popup")

        map("<leader>cu", crates.update_crate, "Update Crate")
        map("<leader>cu", crates.update_crates, "Update Selected Crates", "v")
        map("<leader>ca", crates.update_all_crates, "Update All Crates")
        map("<leader>cU", crates.upgrade_crate, "Upgrade Crate")
        map("<leader>cU", crates.upgrade_crates, "Upgrade Selected Crates", "v")
        map("<leader>cA", crates.upgrade_all_crates, "Upgrade All Crates")

        map("<leader>cx", crates.expand_plain_crate_to_inline_table, "Expand to Inline Table")
        map("<leader>cX", crates.extract_crate_into_table, "Extract into Table")

        map("<leader>cH", crates.open_homepage, "Open Homepage")
        map("<leader>cR", crates.open_repository, "Open Repository")
        map("<leader>cD", crates.open_documentation, "Open Documentation")
    end
}
