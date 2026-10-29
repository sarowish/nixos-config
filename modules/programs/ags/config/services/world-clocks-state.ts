export function zoneName(id: string) {
  const parts = id.replaceAll("_", " ").split("/")
  return { id, city: parts.at(-1) ?? id, region: parts.slice(0, -1).join(" / ") }
}

export function parseZoneTable(text: string) {
  const ids = new Set(["UTC"])
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue
    const id = line.split("\t")[2]
    if (id) ids.add(id)
  }
  return [...ids]
    .map(zoneName)
    .sort((a, b) => a.city.localeCompare(b.city) || a.id.localeCompare(b.id))
}

export function matchesZone(id: string, query: string) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replaceAll(/[_/\s]+/g, " ")
      .trim()
  return normalize(id).includes(normalize(query))
}

export function savedClockIds(value: unknown, available: ReadonlySet<string>) {
  if (!Array.isArray(value)) throw new Error("Saved clocks must be a list of time zones")
  return [
    ...new Set(value.filter((id): id is string => typeof id === "string" && available.has(id))),
  ]
}

export function reorderClocks(ids: string[], id: string, target: string, after: boolean) {
  if (!ids.includes(id) || !ids.includes(target)) return null
  if (id === target) return ids
  const next = ids.filter((savedId) => savedId !== id)
  next.splice(next.indexOf(target) + Number(after), 0, id)
  return next.every((savedId, index) => savedId === ids[index]) ? ids : next
}

export function dayHint(localDate: string, otherDate: string) {
  const days = Math.round((Date.parse(otherDate) - Date.parse(localDate)) / 86_400_000)
  if (days === 0) return ""
  if (days === -1) return "Yesterday"
  if (days === 1) return "Tomorrow"
  return days > 0 ? `${days} days ahead` : `${-days} days behind`
}
