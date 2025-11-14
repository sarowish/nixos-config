{
  outputs =
    { self }:
    {

      c = {
        path = ./c;
      };
      rust = {
        path = ./rust;
      };
    };
}
