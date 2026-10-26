local M = {}
local group = vim.api.nvim_create_augroup('plugin-loading', { clear = true })
local deferred = {}

local function once(setup)
    local loaded = false
    return function()
        if not loaded then
            setup()
            loaded = true
        end
    end
end

local function on_event(load, events, options)
    local callback = load
    if options and options.schedule then
        callback = function() vim.schedule(load) end
    end
    for _, event in ipairs(events) do
        vim.api.nvim_create_autocmd(event[1], {
            group = group,
            pattern = event[2],
            once = true,
            callback = callback,
        })
    end
end

-- Bindings use { mode, keys, rhs, options }; omit rhs for plugin-installed mappings.
local function on_key(load, bindings)
    for _, binding in ipairs(bindings) do
        local mode, keys, rhs, options = binding[1], binding[2], binding[3], binding[4] or {}
        keys = type(keys) == 'string' and { keys } or keys
        for _, key in ipairs(keys) do
            vim.keymap.set(mode, key, function()
                vim.keymap.del(mode, key, { buf = options.buf })
                load()
                if rhs then vim.keymap.set(mode, key, rhs, options) end
                vim.api.nvim_feedkeys(vim.keycode('<Ignore>' .. key), 'mi', false)
            end, {
                desc = options.desc,
                nowait = options.nowait,
                expr = true, -- Retain counts and pending operators until replay.
                buf = options.buf,
            })
        end
    end
end

-- Load the real command on first execution or completion, then forward to it.
local function on_command(load, commands)
    for _, entry in ipairs(commands) do
        local command, options = entry[1], entry[2] or {}
        local function prepare()
            vim.api.nvim_del_user_command(command)
            load()
        end

        vim.api.nvim_create_user_command(command, function(opts)
            prepare()
            local range = options.range and opts.range > 0 and { opts.line1 } or nil
            if range and opts.range == 2 then range[2] = opts.line2 end
            vim.api.nvim_cmd({
                cmd = command,
                args = opts.fargs,
                bang = opts.bang,
                mods = opts.smods,
                count = options.count and opts.count or nil,
                range = range,
            }, {})
        end, vim.tbl_extend('force', options, {
            nargs = '*',
            complete = function(_, line, position)
                prepare()
                return vim.fn.getcompletion(line:sub(1, position), 'cmdline')
            end,
        }))
    end
end

-- Register packages now; the returned handle owns their loading and triggers.
function M.defer(specs, setup)
    vim.pack.add(specs, {
        load = function(plug)
            deferred[plug.spec.name] = once(function()
                vim.cmd.packadd({
                    vim.fn.escape(plug.spec.name, ' '),
                    bang = vim.v.vim_did_init == 0, -- Startup will source plugin scripts once.
                    magic = { file = false },
                })
                if vim.v.vim_did_enter == 1 then
                    for _, path in ipairs(vim.fn.glob(plug.path .. '/after/plugin/**/*.{vim,lua}', false, true)) do
                        vim.cmd.source({ path, magic = { file = false } })
                    end
                end
            end)
        end,
    })

    local names = {}
    for _, spec in ipairs(specs) do
        spec = type(spec) == 'string' and { src = spec } or spec
        names[#names + 1] = (spec.name or spec.src:gsub('%.git$', '')):match('[^/]+$')
    end

    local load = once(function()
        for _, name in ipairs(names) do
            if deferred[name] then deferred[name]() end
        end
        if setup then setup() end
    end)
    local plugin = { load = load }

    function plugin:on_key(bindings)
        on_key(load, bindings)
    end

    function plugin:on_event(events, options)
        on_event(load, events, options)
    end

    function plugin:on_command(commands)
        on_command(load, commands)
    end

    function plugin:on(triggers)
        self:on_command(triggers.commands or {})
        self:on_key(triggers.keys or {})
        self:on_event(triggers.events or {})
    end

    return plugin
end

return M
