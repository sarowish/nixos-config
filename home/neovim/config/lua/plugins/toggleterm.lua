return {
    "akinsho/toggleterm.nvim",
    keys = {
        { "<A-t>" },
        { "<leader>td", "<cmd>ToggleTerm direction=float<cr>" },
        { "<leader>ts", "<cmd>ToggleTerm direction=horizontal<cr>" },
        { "<leader>ta", "<cmd>ToggleTerm size=80 direction=vertical<cr>" },
    },
    opts = {
        open_mapping = [[<A-t>]],
        direction = "float",
        size = 20
    }
}
