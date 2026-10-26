vim.loader.enable()

local config = vim.fn.stdpath('config')
local site = vim.fn.stdpath('data') .. '/site'
-- Keep standard user paths available before fresh installs or later additions.
local keep = {
    [config] = true,
    [config .. '/after'] = true,
    [site] = true,
    [site .. '/after'] = true,
}

for _, option in ipairs({ 'packpath', 'runtimepath' }) do
    local paths = {}
    for _, path in ipairs(vim.opt[option]:get()) do
        if keep[path] or vim.uv.fs_stat(path) then
            paths[#paths + 1] = path
        end
    end
    vim.opt[option] = paths
end

require 'options'
require 'map'
require 'plugins'
require 'lsp'
