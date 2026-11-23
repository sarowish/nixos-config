export type ShutdownSchedule = { type: string; when: number }

export function shutdownSchedule(value: unknown): ShutdownSchedule | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const [type, usec] = value
  if (typeof type !== "string" || !type || !Number.isSafeInteger(usec) || usec <= 0) return null
  return { type, when: usec / 1000 }
}

export function shutdownAfter(minutes: string, now: number): number {
  const text = minutes.trim()
  const count = Number(text)
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(count) || count <= 0)
    throw new Error("Enter a positive whole number of minutes.")
  const deadline = now + count * 60_000
  if (!Number.isSafeInteger(deadline * 1000)) throw new Error("Choose a shorter duration.")
  return deadline
}

// Reject calendar rollover and nonexistent local times rather than scheduling unexpectedly.
function localShutdownDate(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Enter a date (YYYY-MM-DD) and time (HH:MM).")
  const [year, month, day] = date.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const deadline = new Date(year, month - 1, day, hour, minute)
  if (
    deadline.getFullYear() !== year ||
    deadline.getMonth() !== month - 1 ||
    deadline.getDate() !== day ||
    deadline.getHours() !== hour ||
    deadline.getMinutes() !== minute
  )
    throw new Error("Choose a valid local date and time.")
  return deadline
}

export function shutdownDeadline(date: string, time: string, now: number): number {
  const deadline = localShutdownDate(date, time)
  if (deadline.getTime() <= now) throw new Error("Choose a future date and time.")
  return deadline.getTime()
}

export function shiftShutdownTime(
  date: string,
  time: string,
  minutes: number,
): { date: string; time: string } {
  const next = new Date(localShutdownDate(date, time).getTime() + minutes * 60_000)
  const pad = (value: number) => String(value).padStart(2, "0")
  const result = {
    date: `${String(next.getFullYear()).padStart(4, "0")}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`,
    time: `${pad(next.getHours())}:${pad(next.getMinutes())}`,
  }
  if (localShutdownDate(result.date, result.time).getTime() !== next.getTime())
    throw new Error("Choose a time after the daylight-saving clock change.")
  return result
}

export function shutdownRemaining(when: number, now: number): string {
  const minutes = Math.ceil((when - now) / 60_000)
  if (minutes <= 0) return "Shutdown is due"
  const hours = Math.floor(minutes / 60)
  return hours
    ? `${hours}h${minutes % 60 ? ` ${minutes % 60}m` : ""} remaining`
    : `${minutes}m remaining`
}
