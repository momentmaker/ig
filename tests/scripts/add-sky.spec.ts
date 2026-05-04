import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAddSky } from '~/scripts/add-sky'
import type { Manifest } from '~/utils/manifestSchema'

function tempRepo(): { dir: string, manifestPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ig-cli-'))
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify({ version: 1, license: 'CC0-1.0', entries: [] }))
  return { dir, manifestPath }
}

const FIXTURE = 'tests/fixtures/sample.jpg'

describe('runAddSky', () => {
  it('appends a sky entry and uploads to the configured bucket', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    const save = vi.fn().mockResolvedValue([])
    const file = vi.fn().mockReturnValue({ save })
    const bucket = vi.fn().mockReturnValue({ file })
    const fakeStorage = { bucket }

    await runAddSky({
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })

    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    expect(m.entries).toHaveLength(1)
    const e = m.entries[0]
    expect(e?.type).toBe('sky')
    if (e?.type === 'sky') {
      expect(e.date).toBe('2026-05-03')
      expect(e.url).toBe('https://storage.googleapis.com/sky-photos/2026-05-03.jpg')
      expect(e.color).toMatch(/^#[0-9a-f]{6}$/)
      expect(e.solstice).toBe(false)
    }
    expect(bucket).toHaveBeenCalledWith('sky-photos')
    expect(file).toHaveBeenCalledWith('2026-05-03.jpg')
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)

  it('rejects a duplicate sky date', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'sky',
        date: '2026-05-03',
        url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
        w: 100, h: 100, color: '#aabbcc', solstice: false,
      }],
    }))

    const save = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: () => ({ file: () => ({ save }) }) }

    await expect(runAddSky({
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/duplicate sky/i)
    expect(save).not.toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)

  it('marks solstice photos with solstice: true', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    const save = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: () => ({ file: () => ({ save }) }) }

    await runAddSky({
      photoPath,
      date: '2026-12-21',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })

    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    const e = m.entries[0]
    if (e?.type === 'sky') {
      expect(e.solstice).toBe(true)
    }
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)
})
