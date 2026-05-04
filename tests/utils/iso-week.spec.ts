import { describe, it, expect } from 'vitest'
import { isoWeek, isoWeekYear, isoWeeksInYear, isoWeekday, daysInIsoWeek } from '~/utils/iso-week'

describe('isoWeek', () => {
  it('returns 1 for Monday Jan 4 always (ISO week 1 contains Jan 4)', () => {
    expect(isoWeek(new Date('2026-01-04T12:00:00Z'))).toBe(1)
  })
  it('returns 53 for years with 53 ISO weeks', () => {
    // 2020 is an ISO year with 53 weeks. 2020-12-31 is Thursday → week 53.
    expect(isoWeek(new Date('2020-12-31T12:00:00Z'))).toBe(53)
  })
  it('returns 1 for Dec 29-31 in years where they belong to next ISO year', () => {
    // 2025-12-29 is Monday → ISO week 1 of ISO year 2026
    expect(isoWeek(new Date('2025-12-29T12:00:00Z'))).toBe(1)
  })
  it('returns 52 for years where Jan 1 belongs to previous ISO year', () => {
    // 2026-01-01 is Thursday in calendar year 2026 but ISO week 1 of 2026 starts Dec 29 2025.
    // Jan 1 2026 is Thursday → still ISO week 1 of 2026, but 2027-01-01 is Friday → ISO week 53 of 2026.
    expect(isoWeek(new Date('2027-01-01T12:00:00Z'))).toBe(53)
  })
})

describe('isoWeekYear', () => {
  it('returns the ISO year (may differ from calendar year at boundaries)', () => {
    expect(isoWeekYear(new Date('2026-01-04T12:00:00Z'))).toBe(2026)
    expect(isoWeekYear(new Date('2025-12-29T12:00:00Z'))).toBe(2026)
    expect(isoWeekYear(new Date('2027-01-01T12:00:00Z'))).toBe(2026)
  })
})

describe('isoWeeksInYear', () => {
  it('returns 53 for known long ISO years', () => {
    expect(isoWeeksInYear(2020)).toBe(53)
    expect(isoWeeksInYear(2026)).toBe(53)
  })
  it('returns 52 for known short ISO years', () => {
    expect(isoWeeksInYear(2025)).toBe(52)
    expect(isoWeeksInYear(2027)).toBe(52)
  })
})

describe('isoWeekday', () => {
  it('returns 1..7 with Monday=1, Sunday=7', () => {
    // 2026-05-04 is Monday
    expect(isoWeekday(new Date('2026-05-04T12:00:00Z'))).toBe(1)
    // 2026-05-10 is Sunday
    expect(isoWeekday(new Date('2026-05-10T12:00:00Z'))).toBe(7)
  })
})

describe('daysInIsoWeek', () => {
  it('returns 7 dates Mon..Sun in YYYY-MM-DD format', () => {
    const days = daysInIsoWeek(2026, 19)
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-05-04')
    expect(days[6]).toBe('2026-05-10')
  })
})
