import { createState, onCleanup } from "ags"
import { subprocess, type Process } from "ags/process"
import { timeout, type Timer } from "ags/time"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { emptyNiriState, updateNiri, type NiriEvent } from "./niri-state"

export function createNiri() {
  const [state, setState] = createState(emptyNiriState)
  let process: Process | undefined
  let retry: Timer | undefined
  let stopped = false

  function connect() {
    try {
      process = subprocess(["niri", "msg", "--json", "event-stream"], (line) => {
        try {
          setState((previous) => updateNiri(previous, JSON.parse(line) as NiriEvent))
        } catch (error) {
          console.error("Niri event:", error)
        }
      })
      process.connect("exit", () => {
        process = undefined
        setState(emptyNiriState)
        if (!stopped) retry = timeout(1000, connect)
      })
    } catch (error) {
      console.error("Niri connection:", error)
      retry = timeout(1000, connect)
    }
  }

  connect()
  onCleanup(() => {
    stopped = true
    retry?.cancel()
    process?.kill()
  })
  return { state }
}

function requestAction(action: Record<string, unknown>) {
  const path = GLib.getenv("NIRI_SOCKET")
  if (!path) return
  const client = new Gio.SocketClient({ timeout: 2 })
  client.connect_async(new Gio.UnixSocketAddress({ path }), null, (_, result) => {
    let connection: Gio.SocketConnection
    try {
      connection = client.connect_finish(result)
    } catch (error) {
      console.error("Niri action:", error)
      return
    }
    const request = JSON.stringify({ Action: action })
    const output = connection.get_output_stream()
    output.write_all_async(
      new TextEncoder().encode(`${request}\n`),
      GLib.PRIORITY_DEFAULT,
      null,
      (_, res) => {
        try {
          output.write_all_finish(res)
          const input = new Gio.DataInputStream({ base_stream: connection.get_input_stream() })
          input.read_line_async(GLib.PRIORITY_DEFAULT, null, (_, reply) => {
            try {
              const [line] = input.read_line_finish_utf8(reply)
              if (line && "Err" in JSON.parse(line)) console.error("Niri action:", line)
            } catch (error) {
              console.error("Niri action:", error)
            } finally {
              connection.close(null)
            }
          })
        } catch (error) {
          console.error("Niri action:", error)
          connection.close(null)
        }
      },
    )
  })
}

export function focusWorkspace(id: number) {
  requestAction({ FocusWorkspace: { reference: { Id: id } } })
}

export function focusWindow(id: number) {
  requestAction({ FocusWindow: { id } })
}
