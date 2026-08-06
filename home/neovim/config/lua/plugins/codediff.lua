return {
    "esmuellert/codediff.nvim",
    cmd = "CodeDiff",
    keys = {
        {
            "<leader>gv",
            "<cmd>CodeDiff<cr>",
            desc = "Review current changes",
        },
        {
            "<leader>gV",
            "<cmd>CodeDiff origin/main...<cr>",
            desc = "Review changes against origin/main",
        },
    },
    opts = {
        diff = {
            compact = true,
            cycle_hunks_across_files = true,
        },
        explorer = {
            focus_on_select = true,
            line_stats = {
                enabled = true,
                count_untracked = true,
            },
        },
    },
}
