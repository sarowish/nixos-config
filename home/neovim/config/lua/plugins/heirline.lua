return {
    'rebelot/heirline.nvim',
    event = 'VimEnter',
    opts = function()
        local conditions = require 'heirline.conditions'
        local utils = require 'heirline.utils'
        local colors = require("catppuccin.palettes").get_palette()
        local signs = vim.diagnostic.config().signs

        local ViMode = {
            -- get vim current mode, this information will be required by the provider
            -- and the highlight functions, so we compute it only once per component
            -- evaluation and store it as a component attribute
            init = function(self)
                self.mode = vim.fn.mode(1) -- :h mode()
            end,
            -- Now we define some dictionaries to map the output of mode() to the
            -- corresponding string and color. We can put these into `static` to compute
            -- them at initialisation time.
            static = {
                mode_names = { -- change the strings if yow like it vvvvverbose!
                    n = "NORMAL",
                    no = "N?",
                    nov = "N?",
                    noV = "N?",
                    ["no^V"] = "N?",
                    niI = "Ni",
                    niR = "Nr",
                    niV = "Nv",
                    nt = "Nt",
                    v = "VISUAL",
                    vs = "Vs",
                    V = "LINES",
                    Vs = "Vs",
                    ["\22"] = "BLOCK",
                    ["\22s"] = "V",
                    s = "S",
                    S = "S_",
                    ["^S"] = "^S",
                    i = "INSERT",
                    ic = "Ic",
                    ix = "Ix",
                    R = "REPLACE",
                    Rc = "Rc",
                    Rx = "Rx",
                    Rv = "Rv",
                    Rvc = "Rv",
                    Rvx = "Rv",
                    c = "COMMAND",
                    cv = "Ex",
                    r = "...",
                    rm = "M",
                    ["r?"] = "?",
                    ["!"] = "!",
                    t = "TERMINAL",
                },
                mode_colors = {
                    n = colors.lavender,
                    i = colors.green,
                    v = colors.teal,
                    V = colors.teal,
                    ["\22"] = colors.teal,
                    c = colors.blue,
                    s = colors.mauve,
                    S = colors.mauve,
                    ["^S"] = colors.mauve,
                    R = colors.yellow,
                    r = colors.yellow,
                    ["!"] = colors.red,
                    t = colors.red,
                }
            },
            -- We can now access the value of mode() that, by now, would have been
            -- computed by `init()` and use it to index our strings dictionary.
            -- note how `static` fields become just regular attributes once the
            -- component is instantiated.
            -- To be extra meticulous, we can also add some vim statusline syntax to
            -- control the padding and make sure our string is always at least 2
            -- characters long. Plus a nice Icon.
            provider = function(self)
                return " " .. self.mode_names[self.mode] .. " "
            end,
            -- Same goes for the highlight. Now the foreground will change according to the current mode.
            hl = function(self)
                return { fg = colors.mantle, bg = self.mode_colors[self.mode], bold = true, }
            end,
            update = {
                'ModeChanged',
                pattern = "*:*",
                callback = vim.schedule_wrap(function()
                    vim.cmd("redrawstatus")
                end),
            },
        }

        local FileNameBlock = {
            -- let's first set up some attributes needed by this component and it's children
            init = function(self)
                self.filename = vim.api.nvim_buf_get_name(0)
            end,
        }
        -- We can now define some children separately and add them later

        local FileIcon = {
            init = function(self)
                local filename = self.filename
                local extension = vim.fn.fnamemodify(filename, ":e")
                self.icon, self.icon_color = require("nvim-web-devicons").get_icon_color(filename, extension,
                    { default = true })
            end,
            provider = function(self)
                return self.icon and (self.icon .. " ")
            end,
            hl = function(self)
                return { fg = self.icon_color }
            end
        }

        local FileName = {
            provider = function(self)
                -- first, trim the pattern relative to the current directory. For other
                -- options, see :h filename-modifers
                local filename = vim.fn.fnamemodify(self.filename, ":.")
                if filename == "" then return "[No Name]" end
                -- now, if the filename would occupy more than 1/4th of the available
                -- space, we trim the file path to its initials
                if not conditions.width_percent_below(#filename, 0.25) then
                    filename = vim.fn.pathshorten(filename)
                end
                return filename
            end,
            hl = { fg = colors.text },
        }

        local FileFlags = {
            {
                provider = function() if vim.bo.modified then return " [+]" end end,
                hl = { fg = colors.yellow }

            }, {
            provider = function() if (not vim.bo.modifiable) or vim.bo.readonly then return "" end end,
            hl = { fg = colors.peach }
        }
        }

        -- Now, let's say that we want the filename color to change if the buffer is
        -- modified. Of course, we could do that directly using the FileName.hl field,
        -- but we'll see how easy it is to alter existing components using a "modifier"
        -- component

        local FileNameModifer = {
            hl = function()
                if vim.bo.modified then
                    -- use `force` because we need to override the child's hl foreground
                    return { fg = colors.yellow, bold = true, force = true }
                end
            end,
        }

        -- let's add the children to our FileNameBlock component
        FileNameBlock = utils.insert(FileNameBlock,
            FileIcon,
            utils.insert(FileNameModifer, FileName), -- a new table where FileName is a child of FileNameModifier
            unpack(FileFlags),                       -- A small optimisation, since their parent does nothing
            { provider = '%<' }                      -- this means that the statusline is cut here when there's not enough space
        )


        local Git = {
            condition = conditions.is_git_repo,

            init = function(self)
                self.status_dict = vim.b.gitsigns_status_dict
                self.has_changes = self.status_dict.added ~= 0 or self.status_dict.removed ~= 0 or
                    self.status_dict.changed ~= 0
            end,

            hl = { fg = colors.mauve },


            { -- git branch name
                provider = function(self)
                    return " " .. self.status_dict.head .. ' '
                end,
                hl = { bold = true }
            },
            -- You could handle delimiters, icons and counts similar to Diagnostics
            {
                provider = function(self)
                    local count = self.status_dict.added or 0
                    return count > 0 and ("+" .. count .. ' ')
                end,
                hl = { fg = colors.green },
            },
            {
                provider = function(self)
                    local count = self.status_dict.changed or 0
                    return count > 0 and ("~" .. count .. ' ')
                end,
                hl = { fg = colors.blue },
            },
            {
                provider = function(self)
                    local count = self.status_dict.removed or 0
                    return count > 0 and ("-" .. count)
                end,
                hl = { fg = colors.red },
            },
        }

        local Diagnostics = {

            condition = conditions.has_diagnostics,

            static = {
                error_icon = signs and signs.text[vim.diagnostic.severity.ERROR],
                warn_icon = signs and signs.text[vim.diagnostic.severity.WARN],
                info_icon = signs and signs.text[vim.diagnostic.severity.INFO],
                hint_icon = signs and signs.text[vim.diagnostic.severity.HINT],

            },

            init = function(self)
                self.errors = #vim.diagnostic.get(0, { severity = vim.diagnostic.severity.ERROR })
                self.warnings = #vim.diagnostic.get(0, { severity = vim.diagnostic.severity.WARN })
                self.hints = #vim.diagnostic.get(0, { severity = vim.diagnostic.severity.HINT })
                self.info = #vim.diagnostic.get(0, { severity = vim.diagnostic.severity.INFO })
            end,

            {
                provider = function(self)
                    -- 0 is just another output, we can decide to print it or not!
                    return self.errors > 0 and (self.error_icon .. " " .. self.errors .. " ")
                end,
                hl = { fg = colors.red },
            },
            {
                provider = function(self)
                    return self.warnings > 0 and (self.warn_icon .. " " .. self.warnings .. " ")
                end,
                hl = { fg = colors.yellow },
            },
            {
                provider = function(self)
                    return self.info > 0 and (self.info_icon .. " " .. self.info .. " ")
                end,
                hl = { fg = colors.blue },
            },
            {
                provider = function(self)
                    return self.hints > 0 and (self.hint_icon .. " " .. self.hints)
                end,
                hl = { fg = colors.teal },
            },
        }

        local Ruler = {
            -- %l = current line number
            -- %L = number of lines in the buffer
            -- %c = column number
            -- %P = percentage through file of displayed window
            -- provider = "%7(%l/%L:%2c %P",
            init = function(self)
                self.mode = vim.fn.mode(1) -- :h mode()
            end,
            static = {
                mode_colors = {
                    n = colors.lavender,
                    i = colors.green,
                    v = colors.teal,
                    V = colors.teal,
                    ["^V"] = colors.teal,
                    c = colors.blue,
                    s = colors.mauve,
                    S = colors.mauve,
                    ["^S"] = colors.mauve,
                    R = colors.yellow,
                    r = colors.yellow,
                    ["!"] = colors.red,
                    t = colors.red,
                }
            },
            hl = function(self)
                return { fg = colors.mantle, bg = self.mode_colors[self.mode] }
            end,
            {
                provider = " %P ☰  ",
            },
            {
                provider = "%l/%L : %c ",
                hl = { bold = true }
            },
        }

        local FileType = {
            provider = function()
                return string.upper(vim.bo.filetype)
            end,
            hl = { fg = utils.get_highlight("Type").fg, bold = true },
        }

        local TerminalName = {
            -- we could add a condition to check that buftype == 'terminal'
            -- or we could do that later (see #conditional-statuslines below)
            provider = function()
                local tname, _ = vim.api.nvim_buf_get_name(0):gsub(".*:", "")
                return " " .. tname
            end,
            hl = { fg = colors.blue, bold = true },
        }

        local Align = { provider = "%=" }
        local Space = { provider = " " }

        local DefaultStatusLine = {
            ViMode, Space, FileNameBlock, Space, Space, Git, Align, Diagnostics, Space, Ruler
        }

        local SpecialStatusLine = {
            condition = function()
                return conditions.buffer_matches({
                    buftype = { "prompt", "quickfix" },
                    filetype = { "^git.*", "fugitive" },
                })
            end,
            FileNameBlock,
            Space,
            Git,
            Align,
        }

        local HelpStatusLine = {
            condition = function()
                return conditions.buffer_matches({
                    filetype = { "help", "man" },
                })
            end,
            ViMode,
            Space,
            {
                provider = function()
                    return vim.fn.fnamemodify(vim.api.nvim_buf_get_name(0), ":t")
                end,
                hl = { fg = colors.text },
            },
            Space,
            Align,
            Ruler
        }

        local TerminalStatusline = {

            condition = function()
                return conditions.buffer_matches({ buftype = { "terminal" } })
            end,

            { condition = conditions.is_active, ViMode, Space },
            FileType,
            Space,
            TerminalName,
            Align,
        }

        local StatusLines = {
            hl = function()
                return {
                    fg = colors.text,
                    bg = colors.mantle
                }
            end,

            fallthrough = false,

            SpecialStatusLine,
            TerminalStatusline,
            HelpStatusLine,
            DefaultStatusLine,
        }
        return { statusline = StatusLines }
    end
}
