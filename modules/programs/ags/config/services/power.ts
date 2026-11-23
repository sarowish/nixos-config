import { createState, onCleanup } from "ags"
import { execAsync } from "ags/process"
import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { shutdownSchedule, type ShutdownSchedule } from "./power-state"

export type PowerAction = "logout" | "suspend" | "reboot" | "poweroff"

export function createPower() {
  const [available, setAvailable] = createState(false)
  const [schedule, setSchedule] = createState<ShutdownSchedule | null>(null)
  const [busy, setBusy] = createState(false)
  const [error, setError] = createState("")
  const cancellable = new Gio.Cancellable()
  let proxy: Gio.DBusProxy | undefined
  let revision = 0
  const handlers: number[] = []

  function readSchedule(value?: GLib.Variant | null) {
    if (!value) return null
    const type = value.get_child_value(0).get_string()[0]
    // An unset schedule can carry UINT64_MAX, which GJS cannot represent safely.
    if (!type) return null
    return shutdownSchedule([type, value.get_child_value(1).get_uint64()])
  }

  function call(method: string, parameters: GLib.Variant | null) {
    return new Promise<GLib.Variant>((resolve, reject) => {
      if (!proxy?.g_name_owner) return reject(new Error("Power management is unavailable."))
      proxy.call(
        method,
        parameters,
        Gio.DBusCallFlags.ALLOW_INTERACTIVE_AUTHORIZATION,
        -1,
        cancellable,
        (source, result) => {
          try {
            resolve(source!.call_finish(result))
          } catch (cause) {
            reject(cause)
          }
        },
      )
    })
  }

  function update() {
    revision++
    setAvailable(Boolean(proxy?.g_name_owner))
    setSchedule(readSchedule(proxy?.get_cached_property("ScheduledShutdown")))
  }

  async function refresh() {
    if (!proxy?.g_name_owner) return
    const requestedRevision = revision
    try {
      // Explicit reads also recover from logind versions that omit a property notification.
      const reply = await call(
        "org.freedesktop.DBus.Properties.Get",
        new GLib.Variant("(ss)", ["org.freedesktop.login1.Manager", "ScheduledShutdown"]),
      )
      const [value] = reply.deep_unpack() as [GLib.Variant]
      if (!cancellable.is_cancelled() && requestedRevision === revision) {
        proxy.set_cached_property("ScheduledShutdown", value)
        setSchedule(readSchedule(value))
      }
    } catch (cause) {
      if (!cancellable.is_cancelled()) {
        console.error("Reading shutdown schedule:", cause)
        setError(String(cause))
      }
    }
  }

  Gio.DBusProxy.new_for_bus(
    Gio.BusType.SYSTEM,
    Gio.DBusProxyFlags.GET_INVALIDATED_PROPERTIES,
    null,
    "org.freedesktop.login1",
    "/org/freedesktop/login1",
    "org.freedesktop.login1.Manager",
    cancellable,
    (_source, result) => {
      try {
        const ready = Gio.DBusProxy.new_for_bus_finish(result)
        if (cancellable.is_cancelled()) return
        proxy = ready
        handlers.push(proxy.connect("g-properties-changed", update))
        handlers.push(proxy.connect("notify::g-name-owner", update))
        update()
      } catch (cause) {
        if (!cancellable.is_cancelled()) setError(`Power management: ${String(cause)}`)
      }
    },
  )

  async function perform(action: () => Promise<unknown>) {
    if (busy.peek()) return false
    setBusy(true)
    setError("")
    try {
      await action()
      return !cancellable.is_cancelled()
    } catch (cause) {
      if (!cancellable.is_cancelled()) setError(String(cause))
      return false
    } finally {
      if (!cancellable.is_cancelled()) setBusy(false)
    }
  }

  onCleanup(() => {
    cancellable.cancel()
    for (const id of handlers) proxy?.disconnect(id)
  })

  return {
    available,
    schedule,
    busy,
    error,
    refresh,
    scheduleShutdown(when: number) {
      return perform(async () => {
        if (!Number.isSafeInteger(when * 1000) || when <= Date.now())
          throw new Error("Choose a future shutdown time.")
        await call("ScheduleShutdown", new GLib.Variant("(st)", ["poweroff", when * 1000]))
        await refresh()
      })
    },
    cancelShutdown() {
      return perform(async () => {
        await call("CancelScheduledShutdown", null)
        await refresh()
      })
    },
    act(action: PowerAction) {
      return perform(() =>
        action === "logout"
          ? execAsync(["niri", "msg", "action", "quit", "--skip-confirmation"])
          : call(
              { suspend: "Suspend", reboot: "Reboot", poweroff: "PowerOff" }[action],
              new GLib.Variant("(b)", [true]),
            ),
      )
    },
  }
}
