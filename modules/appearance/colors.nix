{
  flake.modules.homeManager.colors =
    { lib, ... }:

    let
      mkColorOption =
        default:
        lib.mkOption {
          inherit default;
          type = lib.types.str;
          description = "Hexadecimal RGB color";
        };
    in
    {
      options.colors = {
        accent = mkColorOption "fb817a";

        background = mkColorOption "1e1e2e";
        foreground = mkColorOption "d9e0ee";

        black = mkColorOption "302d41";
        blue = mkColorOption "96cdfb";
        cyan = mkColorOption "a1e1d6";
        green = mkColorOption "abe9b3";
        magenta = mkColorOption "ddb6f2";
        red = mkColorOption "f28fad";
        white = mkColorOption "d9e0ee";
        yellow = mkColorOption "fae3b0";

        bright = {
          black = mkColorOption "575268";
          blue = mkColorOption "96cdfb";
          cyan = mkColorOption "89dceb";
          green = mkColorOption "abe9b3";
          magenta = mkColorOption "ddb6f2";
          red = mkColorOption "f28fad";
          white = mkColorOption "d9e0ee";
          yellow = mkColorOption "fae3b0";
        };
      };
    };
}
