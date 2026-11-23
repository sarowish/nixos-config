import { createBinding, createComputed, createEffect, createState, type Accessor } from "ags"
import { Gtk } from "ags/gtk4"
import GLib from "gi://GLib?version=2.0"
import type { createPower, PowerAction } from "../services/power"
import {
  shiftShutdownTime,
  shutdownAfter,
  shutdownDeadline,
  shutdownRemaining,
} from "../services/power-state"
import { createReadoutEntry } from "./ReadoutEntry"

const actions: { action: PowerAction; label: string; icon: string; confirm: string }[] = [
  {
    action: "logout",
    label: "Log out",
    icon: "system-log-out-symbolic",
    confirm: "Quit niri and end this session?",
  },
  { action: "suspend", label: "Suspend", icon: "media-playback-pause-symbolic", confirm: "" },
  {
    action: "reboot",
    label: "Restart",
    icon: "view-refresh-symbolic",
    confirm: "Restart this computer?",
  },
  {
    action: "poweroff",
    label: "Shut down",
    icon: "system-shutdown-symbolic",
    confirm: "Shut down this computer?",
  },
]

export default function PowerControls({
  power,
  now,
  open,
  onClose,
}: {
  power: ReturnType<typeof createPower>
  now: Accessor<number>
  open: Accessor<boolean>
  onClose: () => void
}) {
  const [editing, setEditing] = createState(false)
  const [mode, setMode] = createState<"duration" | "time">("duration")
  const [validation, setValidation] = createState("")
  const [confirm, setConfirm] = createState<PowerAction | null>(null)
  const [readoutFocused, setReadoutFocused] = createState(false)
  const minutes = createReadoutEntry({
    css_classes: ["shutdown-minutes"],
    input_purpose: Gtk.InputPurpose.DIGITS,
    placeholder_text: "—",
    width_chars: 3,
    max_width_chars: 5,
    xalign: 0.5,
    hexpand: true,
    tooltip_text: "Shutdown duration in minutes",
  })
  minutes.update_property([Gtk.AccessibleProperty.LABEL], ["Shutdown duration in minutes"])
  const date = new Gtk.Entry({
    css_classes: ["shutdown-date"],
    placeholder_text: "YYYY-MM-DD",
    width_chars: 10,
    max_width_chars: 10,
    xalign: 0.5,
    tooltip_text: "Local date (YYYY-MM-DD)",
  })
  date.update_property([Gtk.AccessibleProperty.LABEL], ["Shutdown date"])
  const time = createReadoutEntry({
    css_classes: ["shutdown-time"],
    placeholder_text: "HH:MM",
    width_chars: 5,
    max_width_chars: 5,
    xalign: 0.5,
    hexpand: true,
    tooltip_text: "Local time (24-hour HH:MM)",
  })
  time.update_property([Gtk.AccessibleProperty.LABEL], ["Shutdown time"])
  const readoutWidths = new Gtk.SizeGroup({ mode: Gtk.SizeGroupMode.HORIZONTAL })
  readoutWidths.add_widget(minutes)
  readoutWidths.add_widget(time)
  function edit() {
    if (editing.peek()) {
      setEditing(false)
      return
    }
    const current = power.schedule.peek()
    const next = GLib.DateTime.new_from_unix_local(
      Math.floor((current?.when ?? Date.now() + 3600_000) / 1000),
    )
    minutes.text = current
      ? String(Math.max(1, Math.ceil((current.when - Date.now()) / 60_000)))
      : ""
    date.text = next.format("%F")!
    time.text = next.format("%H:%M")!
    setMode("duration")
    setValidation("")
    setConfirm(null)
    setEditing(true)
  }
  for (const entry of [minutes, time]) {
    const placeholder = entry.placeholder_text
    const focus = new Gtk.EventControllerFocus()
    focus.connect("enter", () => {
      entry.placeholder_text = ""
    })
    focus.connect("leave", () => {
      entry.placeholder_text = placeholder
    })
    entry.add_controller(focus)
    entry.connect("map", () => {
      entry.grab_focus()
      entry.select_region(0, -1)
    })
  }
  for (const entry of [minutes, date, time]) entry.connect("changed", () => setValidation(""))
  createEffect(() => {
    if (!open()) {
      setConfirm(null)
      setEditing(false)
      setValidation("")
    }
  })
  const enabled = createComputed(() => power.available() && !power.busy())
  const durationMode = new Gtk.ToggleButton({ label: "In minutes", hexpand: true })
  const timeMode = new Gtk.ToggleButton({ label: "At a time", hexpand: true, group: durationMode })
  for (const [button, value] of [
    [durationMode, "duration"],
    [timeMode, "time"],
  ] as const)
    button.connect("toggled", () => {
      if (!button.active) return
      setValidation("")
      setMode(value)
    })
  createEffect(() => {
    durationMode.active = mode() === "duration"
    timeMode.active = mode() === "time"
  })
  const minutesText = createBinding(minutes, "text")
  const durationValue = createComputed(() => {
    const text = minutesText().trim()
    return /^\d+$/.test(text) ? Number(text) : NaN
  })
  const canDecrease = createComputed(
    () => mode() === "time" || (Number.isSafeInteger(durationValue()) && durationValue() > 1),
  )
  function adjustMinutes(delta: number) {
    if (mode.peek() === "time") {
      try {
        const next = shiftShutdownTime(date.text.trim(), time.text.trim(), delta)
        date.text = next.date
        time.text = next.time
      } catch (cause) {
        setValidation(cause instanceof Error ? cause.message : String(cause))
      }
      return
    }
    const current = durationValue.peek()
    const next = Math.max(1, (Number.isSafeInteger(current) && current > 0 ? current : 0) + delta)
    try {
      shutdownAfter(String(next), Date.now())
      minutes.text = String(next)
    } catch (cause) {
      setValidation(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const dateText = createBinding(date, "text")
  const timeText = createBinding(time, "text")
  function relativeDate(days: number) {
    return GLib.DateTime.new_now_local().add_days(days)!.format("%F")!
  }
  function trackFocus(widget: Gtk.Box) {
    const focus = new Gtk.EventControllerFocus()
    focus.connect("enter", () => setReadoutFocused(true))
    focus.connect("leave", () => setReadoutFocused(false))
    widget.add_controller(focus)
  }
  const preview = createComputed(() => {
    now()
    if (!editing()) return ""
    try {
      const deadline =
        mode() === "duration"
          ? shutdownAfter(minutesText(), Date.now())
          : shutdownDeadline(dateText().trim(), timeText().trim(), Date.now())
      return (
        GLib.DateTime.new_from_unix_local(Math.floor(deadline / 1000)).format(
          "Shut down at %H:%M · %a %e %b",
        ) ?? ""
      )
    } catch {
      return ""
    }
  })
  async function schedule(when: number) {
    setValidation("")
    if (await power.scheduleShutdown(when)) setEditing(false)
  }
  function submit() {
    if (!enabled.peek()) return
    try {
      const deadline =
        mode.peek() === "duration"
          ? shutdownAfter(minutes.text, Date.now())
          : shutdownDeadline(date.text.trim(), time.text.trim(), Date.now())
      void schedule(deadline)
    } catch (cause) {
      setValidation(cause instanceof Error ? cause.message : String(cause))
    }
  }
  minutes.connect("activate", submit)
  time.connect("activate", submit)
  date.connect("activate", () => time.grab_focus())
  async function act(action: PowerAction) {
    if (await power.act(action)) {
      setConfirm(null)
      onClose()
    }
  }

  return (
    <box class="power-section" orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      <box spacing={8}>
        <label class="section-title" xalign={0} hexpand label="Power & session" />
        <label class="muted" visible={power.busy} label="Working…" />
      </box>
      <box
        class="shutdown-status"
        orientation={Gtk.Orientation.VERTICAL}
        spacing={8}
        visible={power.schedule((value) => value !== null)}
      >
        <label
          class="schedule-countdown"
          xalign={0}
          label={createComputed(() => {
            const value = power.schedule()
            return value ? shutdownRemaining(value.when, now()) : ""
          })}
        />
        <label
          class="muted"
          xalign={0}
          wrap
          label={power.schedule((value) =>
            value
              ? `${value.type.includes("reboot") ? "Restart" : "Shutdown"} · ${GLib.DateTime.new_from_unix_local(Math.floor(value.when / 1000)).format("%a %e %b, %H:%M")}`
              : "",
          )}
        />
        <box spacing={8} sensitive={enabled}>
          <button hexpand onClicked={edit} label="Reschedule" />
          <button hexpand onClicked={() => void power.cancelShutdown()} label="Cancel shutdown" />
        </box>
      </box>
      <button
        visible={power.schedule((value) => value === null)}
        sensitive={enabled}
        onClicked={edit}
      >
        <box spacing={10}>
          <image iconName="alarm-symbolic" pixelSize={18} />
          <label xalign={0} hexpand label="Schedule shutdown" />
          <image
            iconName={editing((value) => (value ? "pan-up-symbolic" : "pan-down-symbolic"))}
            pixelSize={12}
          />
        </box>
      </button>
      <revealer
        revealChild={editing}
        transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
        transitionDuration={180}
      >
        <box
          class="schedule-editor"
          orientation={Gtk.Orientation.VERTICAL}
          spacing={14}
          sensitive={enabled}
        >
          <box class="schedule-modes" homogeneous spacing={4}>
            {durationMode}
            {timeMode}
          </box>
          <box
            class={createComputed(
              () => `schedule-control ${mode()}-control${readoutFocused() ? " focused" : ""}`,
            )}
            halign={Gtk.Align.CENTER}
            overflow={Gtk.Overflow.HIDDEN}
            $={trackFocus}
          >
            <box
              class="schedule-adjustments left"
              orientation={Gtk.Orientation.VERTICAL}
              homogeneous
            >
              <button
                class="duration-jump"
                label="−5"
                tooltipText="Subtract five minutes"
                sensitive={canDecrease}
                onClicked={() => adjustMinutes(-5)}
              />
              <button
                class="duration-step"
                label="−1"
                tooltipText="Subtract one minute"
                sensitive={canDecrease}
                onClicked={() => adjustMinutes(-1)}
              />
            </box>
            <box
              class="schedule-center"
              orientation={Gtk.Orientation.VERTICAL}
              valign={Gtk.Align.CENTER}
              hexpand
            >
              <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={2}
                visible={mode((value) => value === "duration")}
              >
                {minutes}
                <label class="schedule-caption" label="minutes" />
                <box class="schedule-presets" homogeneous spacing={4}>
                  {[30, 60].map((duration) => (
                    <button
                      class={durationValue((value) =>
                        value === duration ? "duration-preset selected" : "duration-preset",
                      )}
                      label={`${duration} min`}
                      tooltipText={`Set duration to ${duration} minutes`}
                      onClicked={() => {
                        minutes.text = String(duration)
                      }}
                    />
                  ))}
                </box>
              </box>
              <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={2}
                visible={mode((value) => value === "time")}
              >
                {time}
                <label class="schedule-caption" label="local time" />
              </box>
            </box>
            <box
              class="schedule-adjustments right"
              orientation={Gtk.Orientation.VERTICAL}
              homogeneous
            >
              <button
                class="duration-jump"
                label="+5"
                tooltipText="Add five minutes"
                onClicked={() => adjustMinutes(5)}
              />
              <button
                class="duration-step"
                label="+1"
                tooltipText="Add one minute"
                onClicked={() => adjustMinutes(1)}
              />
            </box>
          </box>
          <box
            class="schedule-date"
            spacing={6}
            halign={Gtk.Align.CENTER}
            visible={mode((value) => value === "time")}
          >
            {[
              { days: 0, label: "Today" },
              { days: 1, label: "Tomorrow" },
            ].map(({ days, label }) => (
              <button
                class={createComputed(() => {
                  now()
                  return dateText() === relativeDate(days) ? "date-choice selected" : "date-choice"
                })}
                label={label}
                onClicked={() => {
                  date.text = relativeDate(days)
                }}
              />
            ))}
            <box spacing={6}>
              <image iconName="x-office-calendar-symbolic" pixelSize={14} />
              {date}
            </box>
          </box>
          <label
            class="muted schedule-preview"
            justify={Gtk.Justification.CENTER}
            wrap
            visible={preview((value) => Boolean(value))}
            label={preview}
          />
          <button
            class="primary schedule-submit"
            sensitive={preview((value) => Boolean(value))}
            label={power.schedule((value) =>
              value ? "Update shutdown time" : "Schedule shutdown",
            )}
            onClicked={submit}
          />
          <label class="muted schedule-hint" label="Click the value to type" />
          <label
            class="error"
            wrap
            xalign={0}
            visible={validation((value) => Boolean(value))}
            label={validation}
          />
        </box>
      </revealer>
      <label
        class="error"
        wrap
        xalign={0}
        visible={power.error((value) => Boolean(value))}
        label={power.error}
      />
      <label
        class="muted"
        wrap
        xalign={0}
        visible={power.available((value) => !value)}
        label="Power management is unavailable."
      />
      <box class="power-actions" homogeneous spacing={6}>
        {actions.map(({ action, label, icon, confirm: message }) => (
          <button
            tooltipText={label}
            sensitive={createComputed(
              () => !power.busy() && (action === "logout" || power.available()),
            )}
            onClicked={() => {
              setEditing(false)
              if (message) setConfirm(confirm.peek() === action ? null : action)
              else void act(action)
            }}
          >
            <box orientation={Gtk.Orientation.VERTICAL} spacing={7}>
              <image iconName={icon} pixelSize={20} />
              <label label={label} />
            </box>
          </button>
        ))}
      </box>
      <revealer
        revealChild={confirm((value) => value !== null)}
        transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
      >
        <box orientation={Gtk.Orientation.VERTICAL} spacing={10}>
          <label
            xalign={0}
            wrap
            label={confirm((value) => actions.find((item) => item.action === value)?.confirm ?? "")}
          />
          <box homogeneous spacing={8} sensitive={power.busy((value) => !value)}>
            <button label="Cancel" onClicked={() => setConfirm(null)} />
            <button
              class="destructive"
              label={confirm(
                (value) => actions.find((item) => item.action === value)?.label ?? "Confirm",
              )}
              onClicked={() => {
                const action = confirm.peek()
                if (action) void act(action)
              }}
            />
          </box>
        </box>
      </revealer>
    </box>
  )
}
