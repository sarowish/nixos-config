return {
    "catppuccin/nvim",
    priority = 1000,
    name = "catppuccin",
    opts = function()
        local c = require 'catppuccin.palettes'.get_palette()
        local util = require("catppuccin.utils.colors")

        return {
            flavour = 'mocha',
            dim_inactive = {
                enabled = false,
                shade = "dark",
                percentage = 0.15,
            },
            transparent_background = true,
            term_colors = false,
            compile = {
                enabled = true,
                path = vim.fn.stdpath "cache" .. "/catppuccin",
                suffix = "_compiled"
            },
            styles = {
                comments = { "italic" },
                conditionals = {},
                loops = {},
                functions = {},
                keywords = {},
                strings = {},
                variables = {},
                numbers = {},
                booleans = {},
                properties = {},
                types = {},
                operators = {},
            },
            integrations = {
                treesitter = true,
                native_lsp = {
                    enabled = true,
                    virtual_text = {
                        errors = { "italic" },
                        hints = { "italic" },
                        warnings = { "italic" },
                        information = { "italic" },
                    },
                    underlines = {
                        errors = { "underline" },
                        hints = { "underline" },
                        warnings = { "underline" },
                        information = { "underline" },
                    },
                },
                coc_nvim = false,
                lsp_trouble = false,
                cmp = true,
                lsp_saga = false,
                gitgutter = false,
                gitsigns = true,
                telescope = true,
                nvimtree = {
                    enabled = true,
                    show_root = true,
                    transparent_panel = false,
                },
                neotree = {
                    enabled = false,
                    show_root = true,
                    transparent_panel = true,
                },
                dap = {
                    enabled = false,
                    enable_ui = false,
                },
                which_key = false,
                indent_blankline = {
                    enabled = false,
                    colored_indent_levels = false,
                },
                dashboard = true,
                neogit = false,
                vim_sneak = false,
                fern = false,
                barbar = true,
                bufferline = false,
                markdown = true,
                lightspeed = false,
                ts_rainbow = false,
                hop = false,
                notify = false,
                telekasten = false,
                symbols_outline = true,
                mini = false,
                dropbar = {
                    enabled = true,
                    color_mode = true
                }
            },
            custom_highlights = {
                ["@include"] = { fg = c.red },
                ["@namespace"] = { fg = c.teal, style = {} },
                ["@keyword"] = { fg = c.red },
                ["@variable"] = { fg = c.text },
                ["@punctuation.delimiter"] = { fg = c.subtext1 },
                ["@punctuation.bracket"] = { fg = c.subtext1 },
                ["@function.macro"] = { fg = c.sky },
                ["@keyword.operator"] = { fg = c.peach },
                ["@constant"] = { fg = c.teal },
                ["@operator"] = { fg = c.peach },
                ["@function"] = { fg = c.blue },
                ["@constant.builtin"] = { fg = c.teal },
                ["@number"] = { fg = c.pink },
                ["@keyword.function"] = { fg = c.red },
                ["@conditional"] = { fg = c.red },
                ["@keyword.return"] = { fg = c.red },
                ["@keyword.repeat"] = { fg = c.red },
                ["@keyword.conditional"] = { fg = c.red },
                ["@parameter"] = { fg = c.mauve },
                ["@repeat"] = { fg = c.red },
                ["@field"] = { fg = c.mauve },
                ["@variable.builtin"] = { fg = c.teal },
                ["@boolean"] = { fg = c.pink },
                Operator = { fg = c.peach },
                CursorLineNr = { fg = c.teal },
                NormalFloat = { bg = c.crust },
                GitSignsChange = { fg = c.blue },
                GitSignsAddLn = { bg = util.darken(c.green, 0.15, c.base) },
                GitSignsChangeLn = { bg = util.darken(c.blue, 0.15, c.base) },
                GitSignsDeleteLn = { bg = util.darken(c.red, 0.15, c.base) },
                WhichKey = { fg = c.blue },
                WhichKeyGroup = { fg = c.teal },
                WhichKeyDesc = { fg = c.mauve },
                WhichKeySeparator = { fg = c.subtext1 },
                WhichKeyValue = { fg = c.pink },
                HopNextKey = { fg = c.peach, style = { "bold" } },
                HopNextKey1 = { fg = c.teal, style = { "bold" } },
                HopNextKey2 = { fg = util.darken(c.teal, 0.8) },
                HopUnmatched = { fg = c.overlay0 },
                LspInlayHint = { bg = util.lighten(c.surface0, 0.64, c.base) },
                LspReferenceText = { bg = util.darken(c.teal, 0.15, c.surface0) },
                LspReferenceWrite = { bg = util.darken(c.peach, 0.15, c.surface0) },
                IblScope = { fg = c.peach },
            }
        }
    end,
    config = function(_, opts)
        require("catppuccin").setup(opts)

        vim.cmd [[colorscheme catppuccin]]
    end
}
