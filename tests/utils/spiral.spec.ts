import { describe, it, expect } from 'vitest'
import { spiralCoord, ringOf, ringStart, MAX_N } from '~/utils/spiral'

describe('MAX_N', () => {
  it('is 216 (rings 0..8 totalling 217 cells)', () => {
    expect(MAX_N).toBe(216)
  })
})

describe('ringOf', () => {
  it('places n=0 in ring 0 (center)', () => {
    expect(ringOf(0)).toBe(0)
  })
  it('places n=1..6 in ring 1', () => {
    for (let n = 1; n <= 6; n++) expect(ringOf(n)).toBe(1)
  })
  it('places n=7..18 in ring 2', () => {
    for (let n = 7; n <= 18; n++) expect(ringOf(n)).toBe(2)
  })
  it('places n=169..216 in ring 8', () => {
    for (let n = 169; n <= 216; n++) expect(ringOf(n)).toBe(8)
  })
})

describe('ringStart', () => {
  it('returns the first n in each ring', () => {
    expect(ringStart(0)).toBe(0)
    expect(ringStart(1)).toBe(1)
    expect(ringStart(2)).toBe(7)
    expect(ringStart(3)).toBe(19)
    expect(ringStart(4)).toBe(37)
    expect(ringStart(5)).toBe(61)
    expect(ringStart(6)).toBe(91)
    expect(ringStart(7)).toBe(127)
    expect(ringStart(8)).toBe(169)
  })
})

describe('spiralCoord', () => {
  it('places n=0 at center (0, 0)', () => {
    expect(spiralCoord(0)).toEqual({ q: 0, r: 0 })
  })

  it('places n=1 at the east-most cell of ring 1: (1, 0)', () => {
    expect(spiralCoord(1)).toEqual({ q: 1, r: 0 })
  })

  it('places n=7 at the east-most cell of ring 2: (2, 0)', () => {
    expect(spiralCoord(7)).toEqual({ q: 2, r: 0 })
  })

  it('places n=19 at the east-most cell of ring 3: (3, 0)', () => {
    expect(spiralCoord(19)).toEqual({ q: 3, r: 0 })
  })

  it('walks ring 1 in 6 distinct cells, all at hex-distance 1', () => {
    const seen = new Set<string>()
    for (let n = 1; n <= 6; n++) {
      const { q, r } = spiralCoord(n)
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
      expect(dist).toBe(1)
      seen.add(`${q},${r}`)
    }
    expect(seen.size).toBe(6)
  })

  it('walks ring 8 in 48 distinct cells, all at hex-distance 8', () => {
    const seen = new Set<string>()
    for (let n = 169; n <= 216; n++) {
      const { q, r } = spiralCoord(n)
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
      expect(dist).toBe(8)
      seen.add(`${q},${r}`)
    }
    expect(seen.size).toBe(48)
  })

  it('produces 217 distinct coordinates over n=0..216', () => {
    const seen = new Set<string>()
    for (let n = 0; n <= 216; n++) {
      const { q, r } = spiralCoord(n)
      seen.add(`${q},${r}`)
    }
    expect(seen.size).toBe(217)
  })

  it('throws for n out of range', () => {
    expect(() => spiralCoord(-1)).toThrow(/0-216/)
    expect(() => spiralCoord(217)).toThrow(/0-216/)
    expect(() => spiralCoord(1.5)).toThrow(/integer/i)
  })

  it('walks ring 1 counter-clockwise from east, hitting NE next: (1, -1)', () => {
    expect(spiralCoord(2)).toEqual({ q: 1, r: -1 })
  })
})
