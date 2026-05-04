import { describe, it, expect } from 'vitest'
import { skyEntriesByYear, gridForYear, type SkyCell } from '~/utils/sky-grid'
import type { SkyEntry } from '~/utils/manifestSchema'

const sky2026: SkyEntry = {
  type: 'sky', date: '2026-05-04',
  url: 'https://storage.googleapis.com/skyphotos/2026-05-04.jpg',
  w: 1600, h: 1200, color: '#586878', solstice: false,
}

const sky2025: SkyEntry = {
  type: 'sky', date: '2025-12-29',
  url: 'https://storage.googleapis.com/skyphotos/2025-12-29.jpg',
  w: 1600, h: 1200, color: '#abc123', solstice: false,
}

describe('skyEntriesByYear', () => {
  it('groups by ISO-week-year, not calendar year', () => {
    // 2025-12-29 is Monday → ISO week 1 of ISO year 2026
    const grouped = skyEntriesByYear([sky2025, sky2026])
    expect(grouped.get(2026)).toHaveLength(2)
    expect(grouped.get(2025)).toBeUndefined()
  })

  it('returns an empty map when no sky entries', () => {
    expect(skyEntriesByYear([])).toEqual(new Map())
  })
})

describe('gridForYear', () => {
  it('returns 53 weeks × 7 days for ISO year 2026', () => {
    const grid = gridForYear(2026, [sky2026], '2026-05-04')
    expect(grid).toHaveLength(53)
    expect(grid[0]).toHaveLength(7)
  })

  it('marks the matching sky entry on its day', () => {
    // 2026-05-04 is Monday → ISO week 19, weekday 1 → grid[18][0]
    const grid = gridForYear(2026, [sky2026], '2026-05-04')
    const cell = grid[18]?.[0] as Extract<SkyCell, { kind: 'today-with-photo' }>
    expect(cell.kind).toBe('today-with-photo')
    expect(cell.entry?.date).toBe('2026-05-04')
  })

  it('marks past empty days as gap', () => {
    const grid = gridForYear(2026, [sky2026], '2026-05-04')
    // 2026-04-15 is Wednesday → ISO week 16, weekday 3 → grid[15][2]
    const cell = grid[15]?.[2] as SkyCell
    expect(cell.kind).toBe('gap')
    expect(cell.date).toBe('2026-04-15')
  })

  it('marks future empty days as future', () => {
    const grid = gridForYear(2026, [], '2026-05-04')
    // 2026-12-31 is Thursday → cell exists somewhere
    const allCells = grid.flat()
    const futureCells = allCells.filter(c => c?.kind === 'future')
    expect(futureCells.length).toBeGreaterThan(0)
  })

  it('marks today (no photo) with kind: today-empty', () => {
    const grid = gridForYear(2026, [], '2026-05-04')
    const cell = grid[18]?.[0] as SkyCell
    expect(cell.kind).toBe('today-empty')
  })

  it('marks weeks beyond isoWeeksInYear as null padding', () => {
    // 2025 has only 52 ISO weeks; week 53 row should be all null
    const grid = gridForYear(2025, [], '2025-06-15')
    const week53 = grid[52]
    expect(week53?.every(c => c === null)).toBe(true)
  })
})
