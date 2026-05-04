import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAddCount } from '~/scripts/add-count'
import type { Manifest } from '~/utils/manifestSchema'

function tempRepo(): { dir: string, manifestPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ig-count-'))
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify({ version: 1, license: 'CC0-1.0', entries: [] }))
  return { dir, manifestPath }
}

const FIXTURE = 'tests/fixtures/sample.jpg'

describe('runAddCount', () => {
  it('appends a count entry and uploads with NNN-zero-padded object name', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    const save = vi.fn().mockResolvedValue([])
    const file = vi.fn().mockReturnValue({ save })
    const bucket = vi.fn().mockReturnValue({ file })
    const fakeStorage = { bucket }

    await runAddCount({
      n: 87,
      photoPath,
      date: '2026-05-03',
      whisper: 'parking sign in astoria',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })

    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    expect(m.entries).toHaveLength(1)
    const e = m.entries[0]
    if (e?.type === 'count') {
      expect(e.n).toBe(87)
      expect(e.url).toBe('https://storage.googleapis.com/count-photos/087-2026-05-03.jpg')
      expect(e.whisper).toBe('parking sign in astoria')
    }
    expect(file).toHaveBeenCalledWith('087-2026-05-03.jpg')
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)

  it('rejects out-of-range n', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    const fakeStorage = { bucket: () => ({ file: () => ({ save: vi.fn() }) }) }
    await expect(runAddCount({
      n: 217,
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/0-216/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects whisper longer than 240 chars', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    const fakeStorage = { bucket: () => ({ file: () => ({ save: vi.fn() }) }) }
    await expect(runAddCount({
      n: 5,
      photoPath,
      date: '2026-05-03',
      whisper: 'x'.repeat(241),
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/240/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects duplicate n', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'count', n: 5, date: '2026-04-01',
        url: 'https://storage.googleapis.com/count-photos/005-2026-04-01.jpg',
        w: 100, h: 100,
      }],
    }))
    const fakeStorage = { bucket: () => ({ file: () => ({ save: vi.fn() }) }) }
    await expect(runAddCount({
      n: 5,
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/duplicate count/i)
    rmSync(dir, { recursive: true, force: true })
  })
})
