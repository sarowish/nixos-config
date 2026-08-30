{
  outputs =
    { self }:
    {

      c = {
        path = ./c;
      };
      elixir = {
        path = ./elixir;
      };
      rust = {
        path = ./rust;
      };
    };
}
