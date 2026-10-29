import { interval, timeout, type Timer } from "ags/time"
import { execAsync, subprocess, type Process } from "ags/process"
import { createState, onCleanup } from "ags"
import { mediaTrack } from "./parsers"

export function createMpd() {
  const [track, setTrack] = createState<ReturnType<typeof mediaTrack>>(null)
  const [available, setAvailable] = createState(false)
  const [playing, setPlaying] = createState(false)
  let pending: Promise<void> | undefined
  let watcher: Process | undefined
  let retry: Timer | undefined
  let stopped = false

  function refresh() {
    return (pending ??= execAsync(["mpc", "--format", "%artist%\t%title%", "status"])
      .then((output) => {
        setTrack(mediaTrack(output))
        setPlaying(/^\[playing\]/m.test(output))
        setAvailable(true)
      })
      .catch(() => {
        setAvailable(false)
      })
      .finally(() => {
        pending = undefined
      }))
  }

  async function changed() {
    await pending
    await refresh()
  }
  function watch() {
    try {
      watcher = subprocess(["mpc", "idleloop", "player"], () => void changed())
      void refresh()
      watcher.connect("exit", () => {
        watcher = undefined
        if (!stopped) {
          setAvailable(false)
          retry = timeout(10000, watch)
        }
      })
    } catch (error) {
      console.error("MPD events:", error)
      setAvailable(false)
      retry = timeout(10000, watch)
    }
  }
  const poll = interval(10000, () => void refresh())
  watch()
  onCleanup(() => {
    stopped = true
    poll.cancel()
    retry?.cancel()
    watcher?.kill()
  })
  return {
    track,
    available,
    playing,
    async command(action: "toggle" | "next" | "cdprev") {
      try {
        await execAsync(["mpc", action])
        await pending
        await refresh()
      } catch (error) {
        console.error("MPD:", error)
        setAvailable(false)
      }
    },
  }
}
