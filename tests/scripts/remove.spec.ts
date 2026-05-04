import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRemove } from '~/scripts/remove'

function temp(initial: object): { dir: string, manifestPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ig-rm-'))
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(initial))
  return { dir, manifestPath }
}

describe('runRemove', () => {
  it('removes a sky entry by date and deletes the GCS object', async () => {
    const { dir, manifestPath } = temp({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'sky',
        date: '2026-05-03',
        url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
        w: 100,
        h: 100,
        color: '#aabbcc',
        solstice: false,
      }],
    })
    const del = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: vi.fn().mockReturnValue({ file: vi.fn().mockReturnValue({ delete: del }) }) }
    await runRemove({
      type: 'sky',
      id: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'UTC', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(m.entries).toEqual([])
    expect(del).toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  })

  it('removes a count entry by number', async () => {
    const { dir, manifestPath } = temp({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'count',
        n: 87,
        date: '2026-05-03',
        url: 'https://storage.googleapis.com/count-photos/087-2026-05-03.jpg',
        w: 100,
        h: 100,
      }],
    })
    const del = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: vi.fn().mockReturnValue({ file: vi.fn().mockReturnValue({ delete: del }) }) }
    await runRemove({
      type: 'count',
      id: '87',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'UTC', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(m.entries).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })

  it('throws when no matching entry exists and does not call GCS delete', async () => {
    const { dir, manifestPath } = temp({ version: 1, license: 'CC0-1.0', entries: [] })
    const del = vi.fn()
    const fakeStorage = { bucket: () => ({ file: () => ({ delete: del }) }) }
    await expect(runRemove({
      type: 'sky',
      id: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'UTC', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/not found/i)
    expect(del).not.toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  })
})
