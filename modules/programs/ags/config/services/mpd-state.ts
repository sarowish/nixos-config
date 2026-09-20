export type MpdTrack = {
  file: string
  title: string
  artist: string
  album: string
  state: "playing" | "paused" | "stopped"
  elapsed: number
  duration: number
}

export function timeSeconds(value: string) {
  return value.split(":").reduce((total, part) => total * 60 + Number(part), 0) || 0
}

export function parseMpdStatus(output: string): MpdTrack {
  const lines = output.split("\n")
  const [artist = "", title = "", album = "", file = "", duration = ""] = lines[0].includes("\t")
    ? lines[0].split("\t")
    : []
  const playback = lines.find((line) => /^\[(playing|paused)\]/.test(line))
  const position = playback?.match(/(\d+(?::\d+)+)\/(\d+(?::\d+)+)/)
  return {
    file,
    title: title || file.split("/").pop() || "Nothing playing",
    artist,
    album,
    state: playback?.startsWith("[playing]") ? "playing" : playback ? "paused" : "stopped",
    elapsed: position ? timeSeconds(position[1]) : 0,
    duration: position ? timeSeconds(position[2]) : timeSeconds(duration),
  }
}

export function trackPosition(track: MpdTrack, secondsSinceUpdate: number) {
  const advance = track.state === "playing" ? Math.max(0, secondsSinceUpdate) : 0
  const position = track.elapsed + advance
  return track.duration > 0 ? Math.min(track.duration, position) : position
}

export function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(whole / 60)
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`
}
