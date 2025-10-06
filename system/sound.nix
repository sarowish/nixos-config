{ pkgs, ... }:
let
  cycle_sinks = pkgs.writeShellApplication {
    name = "cycle_sinks";
    runtimeInputs = with pkgs; [
      ripgrep
      wireplumber
      pipewire
      jq
    ];
    text = ''
      default_sink=$(wpctl inspect @DEFAULT_AUDIO_SINK@ | rg -om 1 'id (\d+),' -r '$1')
      sinks=$(pw-dump Node | jq -r '.[] | select(.info.props."media.class" == "Audio/Sink") | .id')

      sinks="$sinks
      $sinks"

      next_sink=$(echo "$sinks" | awk "/$default_sink/{getline x;print x;exit;}")

      wpctl set-default "$next_sink"
    '';
  };
in
{
  security.rtkit.enable = true;

  services.pipewire = {
    enable = true;
    alsa.enable = true;
    pulse.enable = true;
  };

  environment.systemPackages = with pkgs; [
    cycle_sinks
    pulsemixer
    playerctl
  ];
}
