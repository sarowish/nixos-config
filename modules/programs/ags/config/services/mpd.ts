import { interval, timeout, type Timer } from "ags/time"
import { execAsync, subprocess, type Process } from "ags/process"
import { createState, onCleanup } from "ags"
import { mediaTrack } from "./parsers"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { parseMpdStatus } from "./mpd-state"
import { loadMpdArt, type MpdArt } from "./mpd-art"

export function createMpd() {
  const [barTrack, setBarTrack] = createState<ReturnType<typeof mediaTrack>>(null)
  const [available, setAvailable] = createState(false)
  const [track, setTrack] = createState({ ...parseMpdStatus(""), updatedAt: 0 })
  const [art, setArt] = createState<MpdArt | null>(null)
  let artFile = ""
  let artRequest: Gio.Cancellable | undefined
  let pending: Promise<void> | undefined
  let watcher: Process | undefined
  let retry: Timer | undefined
  let stopped = false

  function refresh() {
    if (stopped) return Promise.resolve()
    return (pending ??= execAsync([
      "mpc",
      "--format",
      // execAsync trims output; the prefix preserves empty leading tag fields.
      "song\t%artist%\t%title%\t%album%\t%file%\t%time%",
      "status",
    ])
      .then((output) => {
        if (stopped) return
        const status = output.replace(/^song\t/, "")
        const current = parseMpdStatus(status)
        setTrack({ ...current, updatedAt: GLib.get_monotonic_time() })
        setBarTrack(mediaTrack(status))
        setAvailable(true)
        if (current.file !== artFile) {
          artFile = current.file
          artRequest?.cancel()
          setArt(null)
          if (artFile) {
            const request = (artRequest = new Gio.Cancellable())
            void loadMpdArt(artFile, request).then((cover) => {
              if (!stopped && !request.is_cancelled()) setArt(cover)
            })
          }
        }
      })
      .catch(() => {
        if (stopped) return
        artRequest?.cancel()
        artFile = ""
        setArt(null)
        setTrack({ ...parseMpdStatus(""), updatedAt: 0 })
        setBarTrack(null)
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
    artRequest?.cancel()
  })
  async function command(...args: string[]) {
    try {
      await execAsync(["mpc", ...args])
      await pending
      await refresh()
    } catch (error) {
      console.error("MPD:", error)
      await refresh()
    }
  }
  return {
    track,
    barTrack,
    available,
    playing: track((current) => current.state === "playing"),
    art,
    command(action: "toggle" | "next" | "cdprev") {
      return command(action)
    },
    seek(seconds: number) {
      const duration = track().duration
      if (duration <= 0 || !Number.isFinite(seconds)) return Promise.resolve()
      return command("seek", String(Math.round(Math.max(0, Math.min(duration, seconds)))))
    },
  }
}
