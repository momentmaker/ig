import { describe, it, expect } from 'vitest'
import { currentYear, AUTHOR_TZ } from '~/utils/longNow'

describe('currentYear', () => {
  it('returns a 4-digit year string for a mid-year date', () => {
    expect(currentYear(new Date('2026-06-15T12:00:00Z'))).toBe('2026')
  })

  it('honors the author timezone at the year rollover', () => {
    // 2026-01-01 03:00 UTC = 2025-12-31 22:00 in America/New_York (EST, UTC-5).
    // UTC-based naive code returns '2026'; author-tz code returns '2025'.
    expect(currentYear(new Date('2026-01-01T03:00:00Z'))).toBe('2025')
  })

  it('honors the author timezone at the other side of the rollover', () => {
    // 2026-01-01 06:00 UTC = 2026-01-01 01:00 ET.
    expect(currentYear(new Date('2026-01-01T06:00:00Z'))).toBe('2026')
  })

  it('exports the configured author timezone', () => {
    expect(AUTHOR_TZ).toBe('America/New_York')
  })
})
