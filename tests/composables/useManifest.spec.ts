import { describe, it, expect } from 'vitest'
import { useManifest, ogImageForRoot, homeOgKey } from '~/composables/useManifest'
import type { Entry } from '~/utils/manifestSchema'

const SHA_A = 'a'.repeat(64)
const SHA_B = 'b'.repeat(64)
const SHA_C = 'c'.repeat(64)

function skyEntry(date: string, ogSha: string): Entry {
  return {
    type: 'sky',
    date,
    url: `https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/${date}.jpg`,
    w: 1200,
    h: 1600,
    color: '#888888',
    solstice: false,
    ogSha,
  }
}

function countEntry(n: number, date: string, ogSha: string): Entry {
  return {
    type: 'count',
    n,
    date,
    url: `https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/${String(n).padStart(3, '0')}-${date}.jpg`,
    w: 1200,
    h: 1600,
    ogSha,
  }
}

describe('useManifest', () => {
  it('exposes the manifest with version, license, and entries', () => {
    const m = useManifest()
    expect(m.version).toBe(1)
    expect(m.license).toBe('CC0-1.0')
    expect(Array.isArray(m.entries)).toBe(true)
  })

  it('exposes typed sky/count helpers', () => {
    const m = useManifest()
    const skies = m.entries.filter(e => e.type === 'sky')
    const counts = m.entries.filter(e => e.type === 'count')
    expect(skies.every(e => e.type === 'sky')).toBe(true)
    expect(counts.every(e => e.type === 'count')).toBe(true)
  })
})

describe('ogImageForRoot count', () => {
  it('tie-breaks counts on same date by n descending', () => {
    // #given two count entries on the same date with n=0 and n=1
    const entries: Entry[] = [
      countEntry(0, '2026-05-05', SHA_A),
      countEntry(1, '2026-05-05', SHA_B),
    ]
    // #when picking the count og
    const og = ogImageForRoot(entries, 'count')
    // #then the higher-n count wins
    expect(og).toBe(`/og/${SHA_B}.png`)
  })

  it('prefers later date over higher n', () => {
    // #given a higher-n count on an earlier date
    const entries: Entry[] = [
      countEntry(5, '2026-05-01', SHA_A),
      countEntry(2, '2026-05-10', SHA_B),
    ]
    // #when picking the count og
    const og = ogImageForRoot(entries, 'count')
    // #then the later date wins
    expect(og).toBe(`/og/${SHA_B}.png`)
  })
})

describe('ogImageForRoot home', () => {
  it('returns composite path when both latest sky and count exist', () => {
    // #given a manifest with sky and count entries
    const entries: Entry[] = [
      skyEntry('2026-05-06', SHA_A),
      countEntry(1, '2026-05-05', SHA_B),
    ]
    // #when picking the home og
    const og = ogImageForRoot(entries, 'home')
    // #then it returns the composite key
    expect(og).toBe(`/og/${homeOgKey(SHA_A, SHA_B)}.png`)
  })

  it('falls back to brand when sky missing', () => {
    // #given only count entries
    const entries: Entry[] = [countEntry(1, '2026-05-05', SHA_B)]
    // #when picking the home og
    const og = ogImageForRoot(entries, 'home')
    // #then it falls back to the brand image
    expect(og).toBe('/og-brand.png')
  })

  it('falls back to brand when count missing', () => {
    // #given only sky entries
    const entries: Entry[] = [skyEntry('2026-05-06', SHA_A)]
    // #when picking the home og
    const og = ogImageForRoot(entries, 'home')
    // #then it falls back to the brand image
    expect(og).toBe('/og-brand.png')
  })

  it('home key is deterministic and includes both sha prefixes', () => {
    // #when computing the same key twice
    const k1 = homeOgKey(SHA_A, SHA_B)
    const k2 = homeOgKey(SHA_A, SHA_B)
    // #then it is stable and contains both prefixes
    expect(k1).toBe(k2)
    expect(k1).toContain(SHA_A.slice(0, 16))
    expect(k1).toContain(SHA_B.slice(0, 16))
    // #and a different sha yields a different key
    expect(homeOgKey(SHA_A, SHA_C)).not.toBe(k1)
  })
})
