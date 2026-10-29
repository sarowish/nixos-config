// Use UTC for calendar arithmetic so daylight-saving changes cannot skip a date.
export function monthDates(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (first.getUTCDay() + 6) % 7
  return Array.from(
    { length: 42 },
    (_, index) => new Date(Date.UTC(year, month, index - offset + 1)),
  )
}
