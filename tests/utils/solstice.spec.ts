import { describe, it, expect, test } from 'vitest'
import { isSolstice, solsticeKind, activeWindow, type SolsticeKind } from '~/utils/solstice'

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

describe('activeWindow', () => {
  test('returns null on day ±2 from mile-marker', () => {
    expect(activeWindow('2026-06-18')).toBeNull()
    expect(activeWindow('2026-06-23')).toBeNull()
  })

  test('returns kind and anchor for day before mile-marker', () => {
    expect(activeWindow('2026-06-20')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
  })

  test('returns kind and anchor on the exact mile-marker', () => {
    expect(activeWindow('2026-06-21')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
  })

  test('returns kind and anchor for day after mile-marker', () => {
    expect(activeWindow('2026-06-22')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
  })

  test('handles year boundaries (winter solstice in late December)', () => {
    expect(activeWindow('2025-12-21')).toEqual({ kind: 'winter', anchor: '2025-12-21' })
    expect(activeWindow('2025-12-22')).toEqual({ kind: 'winter', anchor: '2025-12-21' })
    expect(activeWindow('2025-12-20')).toEqual({ kind: 'winter', anchor: '2025-12-21' })
    expect(activeWindow('2025-12-23')).toBeNull()
  })

  test('handles all four mile-markers in 2026', () => {
    expect(activeWindow('2026-03-20')).toEqual({ kind: 'vernal', anchor: '2026-03-20' })
    expect(activeWindow('2026-06-21')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
    expect(activeWindow('2026-09-23')).toEqual({ kind: 'autumnal', anchor: '2026-09-23' })
    expect(activeWindow('2026-12-21')).toEqual({ kind: 'winter', anchor: '2026-12-21' })
  })

  test('throws on invalid date format', () => {
    expect(() => activeWindow('2026/06/21')).toThrow()
    expect(() => activeWindow('not-a-date')).toThrow()
  })
})
