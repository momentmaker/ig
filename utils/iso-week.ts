// All functions operate on UTC. Inputs in local timezone produce subtly wrong
// results at midnight; callers must pass UTC dates or YYYY-MM-DD strings via
// new Date(`${dateStr}T00:00:00Z`).

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function isoWeekday(d: Date): number {
  // ISO weekday: Monday=1, Sunday=7. JS getUTCDay: Sunday=0, Saturday=6.
  const dow = d.getUTCDay()
  return dow === 0 ? 7 : dow
}

function thursdayOfWeek(d: Date): Date {
  // The Thursday of the same ISO week. Used because ISO weeks are pinned to
  // their Thursday for year/week computation.
  const utc = toUTCMidnight(d)
  const offset = 4 - isoWeekday(utc)  // 4 = Thursday
  utc.setUTCDate(utc.getUTCDate() + offset)
  return utc
}

export function isoWeekYear(d: Date): number {
  return thursdayOfWeek(d).getUTCFullYear()
}

export function isoWeek(d: Date): number {
  const thu = thursdayOfWeek(d)
  const jan4 = thursdayOfWeek(new Date(Date.UTC(thu.getUTCFullYear(), 0, 4)))
  const diffDays = Math.round((thu.getTime() - jan4.getTime()) / 86_400_000)
  return Math.floor(diffDays / 7) + 1
}

export function isoWeeksInYear(isoYear: number): number {
  // Year has 53 weeks if Jan 1 is Thursday or (it's a leap year and Jan 1 is Wednesday).
  const jan1 = new Date(Date.UTC(isoYear, 0, 1))
  const jan1Dow = isoWeekday(jan1)
  const isLeap = (isoYear % 4 === 0 && isoYear % 100 !== 0) || isoYear % 400 === 0
  if (jan1Dow === 4) return 53
  if (jan1Dow === 3 && isLeap) return 53
  return 52
}

export function daysInIsoWeek(isoYear: number, week: number): string[] {
  // Week 1 contains the first Thursday of the ISO year.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (isoWeekday(jan4) - 1))
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + i)
    const yyyy = day.getUTCFullYear()
    const mm = String(day.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(day.getUTCDate()).padStart(2, '0')
    out.push(`${yyyy}-${mm}-${dd}`)
  }
  return out
}
