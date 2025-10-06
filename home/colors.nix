{ lib, ... }:

{
  options.colors = lib.mkOption {
    type = lib.types.attrs;
    description = "Color scheme";
  };

  config.colors = {
    accent = "ff4b77";

    background = "1e1e2e";
    foreground = "d9e0ee";

    black = "302d41";
    blue = "96cdfb";
    cyan = "a1e1d6";
    green = "abe9b3";
    magenta = "ddb6f2";
    red = "f28fad";
    white = "d9e0ee";
    yellow = "fae3b0";

    bright = {
      black = "575268";
      blue = "96cdfb";
      cyan = "89dceb";
      green = "abe9b3";
      magenta = "ddb6f2";
      red = "f28fad";
      white = "d9e0ee";
      yellow = "fae3b0";
    };
  };
}
