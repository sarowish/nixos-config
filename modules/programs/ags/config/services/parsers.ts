export function mediaLabel(status: string) {
  const lines = status.split("\n")
  if (!lines.some((line) => /^\[(playing|paused)\]/.test(line))) return "     "
  const [artist = "", title = ""] = lines[0].split("\t")
  const characters = Array.from(title)
  const shortened = characters.slice(0, 80).join("")
  return `${artist} - ${shortened}`
}

export function cpuSample(stat: string) {
  const values = stat.split("\n")[0].trim().split(/\s+/).slice(1, 9).map(Number)
  // Guest time is already included in user/nice. Do not count it twice.
  return { total: values.reduce((sum, value) => sum + value, 0), idle: values[3] + values[4] }
}

export function cpuUsage(
  previous: ReturnType<typeof cpuSample>,
  current: ReturnType<typeof cpuSample>,
) {
  const total = current.total - previous.total
  if (total <= 0) return 0
  return Math.round(100 * Math.max(0, Math.min(1, 1 - (current.idle - previous.idle) / total)))
}

export function memoryUsed(meminfo: string) {
  const fields = Object.fromEntries(
    meminfo
      .trim()
      .split("\n")
      .map((line) => {
        const [key, value] = line.split(/:\s+/)
        return [key, Number.parseInt(value, 10)]
      }),
  )
  return Math.floor((fields.MemTotal - fields.MemAvailable) / 1024)
}
