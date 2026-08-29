vim.filetype.add {
    extension = { rasi = 'rasi' },
    pattern = {
        ['.*/waybar/config'] = 'jsonc',
        ['.*/btop/btop.conf'] = 'dosini',
        ['.*/mako/config'] = 'dosini',
        ['.*/hypr/.*%.conf'] = 'hyprlang',
    },
}
