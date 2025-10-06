{
  programs.yazi = {
    enable = true;
    settings = {
      mgr = {
        linemode = "size";
        show_hidden = true;
      };
    };
    theme.mode = {
      normal_main = {
        fg = "black";
        bg = "blue";
        bold = true;
      };
      normal_alt = {
        fg = "blue";
        bg = "black";
      };
      select_main = {
        fg = "black";
        bg = "cyan";
        bold = true;
      };
      select_alt = {
        fg = "cyan";
        bg = "black";
      };

      unset_main = {
        fg = "black";
        bg = "red";
        bold = true;
      };
      unset_alt = {
        fg = "red";
        bg = "black";
      };
    };
  };
}
