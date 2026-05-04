import { isoWeekYear, isoWeeksInYear, daysInIsoWeek } from './iso-week'
import type { SkyEntry } from './manifestSchema'

export type SkyCell =
  | { kind: 'has-photo', date: string, entry: SkyEntry }
  | { kind: 'today-with-photo', date: string, entry: SkyEntry }
  | { kind: 'today-empty', date: string }
  | { kind: 'gap', date: string }
  | { kind: 'future', date: string }

export function skyEntriesByYear(entries: SkyEntry[]): Map<number, SkyEntry[]> {
  const out = new Map<number, SkyEntry[]>()
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00Z`)
    const year = isoWeekYear(d)
    const list = out.get(year) ?? []
    list.push(e)
    out.set(year, list)
  }
  return out
}

export function gridForYear(
  isoYear: number,
  entries: SkyEntry[],
  todayYYYYMMDD: string,
): (SkyCell | null)[][] {
  const byDate = new Map<string, SkyEntry>()
  for (const e of entries) {
    if (isoWeekYear(new Date(`${e.date}T00:00:00Z`)) === isoYear) {
      byDate.set(e.date, e)
    }
  }
  const today = todayYYYYMMDD
  const weeks = isoWeeksInYear(isoYear)
  const grid: (SkyCell | null)[][] = []
  for (let w = 1; w <= 53; w++) {
    if (w > weeks) {
      grid.push(Array.from({ length: 7 }, () => null))
      continue
    }
    const days = daysInIsoWeek(isoYear, w)
    const row: (SkyCell | null)[] = days.map((date) => {
      const entry = byDate.get(date)
      const isToday = date === today
      if (entry !== undefined) {
        return isToday
          ? { kind: 'today-with-photo', date, entry }
          : { kind: 'has-photo', date, entry }
      }
      if (isToday) return { kind: 'today-empty', date }
      if (date < today) return { kind: 'gap', date }
      return { kind: 'future', date }
    })
    grid.push(row)
  }
  return grid
}
