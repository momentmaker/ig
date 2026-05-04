import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadManifest, saveManifest, appendEntry } from '~/scripts/lib/manifest'
import type { Manifest, SkyEntry, CountEntry } from '~/utils/manifestSchema'

function tempManifest(initial: Manifest): string {
  const dir = mkdtempSync(join(tmpdir(), 'ig-mf-'))
  const path = join(dir, 'manifest.json')
  writeFileSync(path, JSON.stringify(initial))
  return path
}

const sky: SkyEntry = {
  type: 'sky',
  date: '2026-05-03',
  url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
  w: 1600,
  h: 1200,
  color: '#a8c4e6',
  solstice: false,
}

const count: CountEntry = {
  type: 'count',
  n: 87,
  date: '2026-05-04',
  url: 'https://storage.googleapis.com/count-photos/087-2026-05-04.jpg',
  w: 1600,
  h: 1200,
}

describe('loadManifest', () => {
  it('loads and validates a well-formed manifest', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    const m = loadManifest(path)
    expect(m.entries).toEqual([])
    rmSync(path, { force: true })
  })

  it('throws on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ig-mf-'))
    const path = join(dir, 'manifest.json')
    writeFileSync(path, '{not json')
    expect(() => loadManifest(path)).toThrow()
    rmSync(dir, { recursive: true, force: true })
  })

  it('throws on schema violations', () => {
    const path = tempManifest({ version: 99, license: 'CC0-1.0', entries: [] } as unknown as Manifest)
    expect(() => loadManifest(path)).toThrow(/version/)
    rmSync(path, { force: true })
  })
})

describe('saveManifest', () => {
  it('writes pretty-printed JSON with a trailing newline', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    saveManifest(path, { version: 1, license: 'CC0-1.0', entries: [sky] })
    const text = readFileSync(path, 'utf8')
    expect(text.endsWith('\n')).toBe(true)
    expect(text).toContain('"version": 1')
    rmSync(path, { force: true })
  })

  it('rejects invalid manifests at save time', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    expect(() => saveManifest(path, {
      version: 1,
      license: 'CC0-1.0',
      entries: [sky, sky],
    })).toThrow(/duplicate/)
    rmSync(path, { force: true })
  })

  it('sorts entries on write (count before sky, then by id)', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    saveManifest(path, { version: 1, license: 'CC0-1.0', entries: [sky, count] })
    const m = loadManifest(path)
    expect(m.entries[0]?.type).toBe('count')
    expect(m.entries[1]?.type).toBe('sky')
    rmSync(path, { force: true })
  })
})

describe('appendEntry', () => {
  it('appends a sky entry to an empty manifest', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    appendEntry(path, sky)
    expect(loadManifest(path).entries).toHaveLength(1)
    rmSync(path, { force: true })
  })

  it('rejects appending a duplicate sky date', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [sky] })
    expect(() => appendEntry(path, sky)).toThrow(/duplicate sky/i)
    rmSync(path, { force: true })
  })

  it('rejects appending a duplicate count number', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [count] })
    expect(() => appendEntry(path, count)).toThrow(/duplicate count/i)
    rmSync(path, { force: true })
  })
})
