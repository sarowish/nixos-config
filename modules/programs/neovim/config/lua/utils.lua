local M = {}

function M.get_filename_cached()
    local bufnr_name_cache = {}
    return function(bufnr)
        local c = bufnr_name_cache[bufnr]
        if c then
            return c
        end

        local n = vim.api.nvim_buf_get_name(bufnr)
        bufnr_name_cache[bufnr] = n
        return n
    end
end

function M.show_toc()
    local pickers = require "telescope.pickers"
    local finders = require "telescope.finders"
    local conf = require "telescope.config".values

    local opts = {
        layout_config = {
            height = function(_, _, max_lines)
                return math.min(max_lines, 40)
            end
        }
    }
    opts = require('telescope.themes').get_dropdown(opts)

    local get_filename = M.get_filename_cached()
    pickers.new(opts, {
        prompt_title = "Table of Contents",
        finder = finders.new_table {
            results = vim.fn.getloclist(0),
            entry_maker = function(entry)
                local filename = get_filename(entry.bufnr)
                return {
                    value = entry,
                    display = entry.text,
                    ordinal = entry.text,
                    filename = filename,
                    bufnr = entry.bufnr,
                    lnum = entry.lnum,
                }
            end
        },
        sorter = conf.generic_sorter(opts),
    }):find()
end

return M
