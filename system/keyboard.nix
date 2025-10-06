{ pkgs, ... }:

{
  services.xserver.xkb = {
    layout = "eria,us,tr";
    options = "grp:alt_space_toggle,caps:ctrl_shifted_capslock";
    extraLayouts.eria = {
      description = "Eria us keyboard layout";
      languages = [ "eng" ];
      symbolsFile = pkgs.writeText "eria" ''
        default partial
        xkb_symbols "basic" {
            include "us(basic)"

            name[Group1] = "Eria";

            key <AD01> {[ j, J ]};
            key <AD02> {[ l, L ]};
            key <AD03> {[ u, U ]};
            key <AD04> {[ o, O ]};
            key <AD05> {[ x, X ]};
            key <AD06> {[ apostrophe, quotedbl ]};
            key <AD07> {[ f, F ]};
            key <AD08> {[ d, D ]};
            key <AD09> {[ h, H ]};
            key <AD10> {[ w, W]};
            key <AC01> {[ e, E, semicolon ]};
            key <AC02> {[ r, R, colon ]};
            key <AC03> {[ i, I, comma ]};
            key <AC04> {[ a, A, period ]};
            key <AC05> {[ q, Q, less ]};
            key <AC06> {[ y, Y, greater ]};
            key <AC07> {[ c, C, h, H ]};
            key <AC08> {[ s, S, j, J ]};
            key <AC09> {[ n, N, k, K ]};
            key <AC10> {[ t, T, l, L ]};
            key <AC11> {[ v, V ]};
            key <AB01> {[ z, Z ]};
            key <AB02> {[ comma, less ]};
            key <AB03> {[ period, greater ]};
            key <AB04> {[ semicolon, colon ]};
            key <AB05> {[ slash, question ]};
            key <AB06> {[ g, G ]};
            key <AB07> {[ p, P ]};
            key <AB08> {[ m, M]};
            key <AB09> {[ b, B ]};
            key <AB10> {[ k, K ]};

            include "level3(ralt_switch)"
        };
      '';
    };
  };

  console = {
    useXkbConfig = true;
    earlySetup = true;
  };
}
