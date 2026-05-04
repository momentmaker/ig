import { describe, it, expect } from 'vitest'
import { isSolstice, solsticeKind, type SolsticeKind } from '~/utils/solstice'

describe('isSolstice', () => {
  it('returns true for known 2026 solstices and equinoxes', () => {
    expect(isSolstice('2026-03-20')).toBe(true)
    expect(isSolstice('2026-06-21')).toBe(true)
    expect(isSolstice('2026-09-23')).toBe(true)
    expect(isSolstice('2026-12-21')).toBe(true)
  })

  it('returns false for ordinary days in 2026', () => {
    expect(isSolstice('2026-01-15')).toBe(false)
    expect(isSolstice('2026-05-03')).toBe(false)
    expect(isSolstice('2026-11-11')).toBe(false)
  })

  it('returns true for known 2024 mile-markers', () => {
    expect(isSolstice('2024-03-20')).toBe(true)
    expect(isSolstice('2024-06-20')).toBe(true)
    expect(isSolstice('2024-09-22')).toBe(true)
    expect(isSolstice('2024-12-21')).toBe(true)
  })

  it('returns true for known 2030 mile-markers', () => {
    expect(isSolstice('2030-03-20')).toBe(true)
    expect(isSolstice('2030-06-21')).toBe(true)
    expect(isSolstice('2030-09-22')).toBe(true)
    expect(isSolstice('2030-12-21')).toBe(true)
  })
})

describe('solsticeKind', () => {
  it('classifies 2026 mile-markers correctly', () => {
    expect(solsticeKind('2026-03-20')).toBe<SolsticeKind>('vernal')
    expect(solsticeKind('2026-06-21')).toBe<SolsticeKind>('summer')
    expect(solsticeKind('2026-09-23')).toBe<SolsticeKind>('autumnal')
    expect(solsticeKind('2026-12-21')).toBe<SolsticeKind>('winter')
  })

  it('returns null for non-mile-marker days', () => {
    expect(solsticeKind('2026-05-03')).toBeNull()
  })
})
