local plugins = {}
for file in vim.fs.dir(vim.fn.stdpath('config') .. '/lua/plugins') do
    local name = file:match('^(.+)%.lua$')
    if name and name ~= 'init' then plugins[#plugins + 1] = name end
end

table.sort(plugins)
for _, name in ipairs(plugins) do
    require('plugins.' .. name)
end
