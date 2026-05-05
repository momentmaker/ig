import { describe, it, expect } from 'vitest'
import {
  validateManifest,
  validateEntry,
  sortEntries,
  type Manifest,
  type SkyEntry,
  type CountEntry,
} from '~/utils/manifestSchema'

const validSky: SkyEntry = {
  type: 'sky',
  date: '2026-05-03',
  url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
  w: 1600,
  h: 1200,
  color: '#a8c4e6',
  solstice: false,
  ogSha: 'a'.repeat(64),
}

const validCount: CountEntry = {
  type: 'count',
  n: 87,
  date: '2026-05-03',
  url: 'https://storage.googleapis.com/count-photos/087-2026-05-03.jpg',
  w: 1600,
  h: 1200,
  ogSha: 'b'.repeat(64),
}

describe('validateEntry', () => {
  it('accepts a valid sky entry', () => {
    expect(() => validateEntry(validSky)).not.toThrow()
  })

  it('accepts a valid count entry', () => {
    expect(() => validateEntry(validCount)).not.toThrow()
  })

  it('rejects sky entry with malformed date', () => {
    expect(() => validateEntry({ ...validSky, date: '5/3/26' })).toThrow(/date/i)
  })

  it('rejects count entry with n out of range', () => {
    expect(() => validateEntry({ ...validCount, n: 217 })).toThrow(/0-216/)
    expect(() => validateEntry({ ...validCount, n: -1 })).toThrow(/0-216/)
  })

  it('rejects count entry with non-integer n', () => {
    expect(() => validateEntry({ ...validCount, n: 87.5 })).toThrow(/integer/i)
  })

  it('rejects count entry with whisper longer than 240 chars', () => {
    const long = 'x'.repeat(241)
    expect(() => validateEntry({ ...validCount, whisper: long })).toThrow(/240/)
  })

  it('accepts count entry with empty whisper omitted', () => {
    expect(() => validateEntry({ ...validCount })).not.toThrow()
  })

  it('rejects entry with unknown type', () => {
    expect(() => validateEntry({ ...validSky, type: 'rainbow' as 'sky' })).toThrow(/type/i)
  })

  it('rejects sky entry missing dominant color', () => {
    const { color: _, ...rest } = validSky
    expect(() => validateEntry(rest as SkyEntry)).toThrow(/color/i)
  })

  it('rejects sky entry with non-hex color', () => {
    expect(() => validateEntry({ ...validSky, color: 'not-a-hex' })).toThrow(/color/i)
  })

  it('rejects entry with non-https url', () => {
    expect(() => validateEntry({ ...validSky, url: 'http://example.com/x.jpg' })).toThrow(/url/i)
  })
})

describe('validateManifest', () => {
  it('accepts an empty manifest', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [] }
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('accepts a manifest with one of each type', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [validSky, validCount] }
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('rejects a manifest with wrong version', () => {
    const m = { version: 2, license: 'CC0-1.0', entries: [] } as unknown as Manifest
    expect(() => validateManifest(m)).toThrow(/version/i)
  })

  it('rejects a manifest with duplicate sky dates', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [validSky, validSky] }
    expect(() => validateManifest(m)).toThrow(/duplicate sky/i)
  })

  it('rejects a manifest with duplicate count numbers', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [validCount, validCount] }
    expect(() => validateManifest(m)).toThrow(/duplicate count/i)
  })
})

describe('ogSha', () => {
  it('accepts entry with ogSha', () => {
    const e = {
      type: 'sky', date: '2026-05-04',
      url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
      w: 1600, h: 1200, color: '#586878', solstice: false,
      ogSha: 'a'.repeat(64),
    }
    expect(() => validateEntry(e)).not.toThrow()
  })

  it('rejects sky entry without ogSha (post-backfill)', () => {
    const e = {
      type: 'sky', date: '2026-05-04',
      url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
      w: 1600, h: 1200, color: '#586878', solstice: false,
    }
    expect(() => validateEntry(e)).toThrow(/ogSha/)
  })

  it('rejects count entry without ogSha (post-backfill)', () => {
    const e = {
      type: 'count', n: 47, date: '2026-05-04',
      url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/047.jpg',
      w: 1600, h: 1200,
    }
    expect(() => validateEntry(e)).toThrow(/ogSha/)
  })

  it('rejects ogSha that is not 64 hex chars', () => {
    const e = {
      type: 'sky', date: '2026-05-04',
      url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
      w: 1600, h: 1200, color: '#586878', solstice: false,
      ogSha: 'too-short',
    }
    expect(() => validateEntry(e)).toThrow(/ogSha/)
  })

  it('rejects ogSha when present but non-string', () => {
    const e = {
      type: 'sky', date: '2026-05-04',
      url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
      w: 1600, h: 1200, color: '#586878', solstice: false,
      ogSha: 12345,
    }
    expect(() => validateEntry(e)).toThrow(/ogSha/)
  })
})

describe('sky.time', () => {
  it('accepts sky entry with valid HH:MM time', () => {
    expect(() => validateEntry({ ...validSky, time: '06:42' })).not.toThrow()
    expect(() => validateEntry({ ...validSky, time: '23:59' })).not.toThrow()
    expect(() => validateEntry({ ...validSky, time: '00:00' })).not.toThrow()
  })

  it('accepts sky entry without time (optional)', () => {
    expect(() => validateEntry(validSky)).not.toThrow()
  })

  it('rejects sky entry with bad time format', () => {
    expect(() => validateEntry({ ...validSky, time: '6:42' })).toThrow(/time/i)
    expect(() => validateEntry({ ...validSky, time: '24:00' })).toThrow(/time/i)
    expect(() => validateEntry({ ...validSky, time: '12:60' })).toThrow(/time/i)
    expect(() => validateEntry({ ...validSky, time: '12:34:56' })).toThrow(/time/i)
    expect(() => validateEntry({ ...validSky, time: 'abc' })).toThrow(/time/i)
  })

  it('rejects sky entry with non-string time', () => {
    expect(() => validateEntry({ ...validSky, time: 642 })).toThrow(/time/i)
  })
})

describe('sortEntries', () => {
  it('sorts count entries before sky entries (alphabetical type)', () => {
    const result = sortEntries([validSky, validCount])
    expect(result[0]?.type).toBe('count')
    expect(result[1]?.type).toBe('sky')
  })

  it('sorts count entries by n ascending', () => {
    const c1: CountEntry = { ...validCount, n: 5 }
    const c2: CountEntry = { ...validCount, n: 100 }
    const c3: CountEntry = { ...validCount, n: 42 }
    const result = sortEntries([c1, c2, c3])
    expect(result.map(e => (e as CountEntry).n)).toEqual([5, 42, 100])
  })

  it('sorts sky entries by date ascending', () => {
    const s1: SkyEntry = { ...validSky, date: '2026-01-15' }
    const s2: SkyEntry = { ...validSky, date: '2026-12-31' }
    const s3: SkyEntry = { ...validSky, date: '2026-06-01' }
    const result = sortEntries([s1, s2, s3])
    expect(result.map(e => (e as SkyEntry).date)).toEqual(['2026-01-15', '2026-06-01', '2026-12-31'])
  })
})
