import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chdir, cwd } from 'node:process'
import { runAddCount } from '~/scripts/add-count'
import type { Manifest } from '~/utils/manifestSchema'

const FIXTURE = join(cwd(), 'tests/fixtures/sample.jpg')

let workDir: string
let originalCwd: string

beforeEach(() => {
  originalCwd = cwd()
  workDir = mkdtempSync(join(tmpdir(), 'ig-count-'))
  mkdirSync(join(workDir, 'data'))
  writeFileSync(
    join(workDir, 'data/manifest.json'),
    JSON.stringify({ version: 1, license: 'CC0-1.0', entries: [] }),
  )
  chdir(workDir)
})

afterEach(() => {
  chdir(originalCwd)
  rmSync(workDir, { recursive: true, force: true })
})

describe('runAddCount', () => {
  it('appends a count entry and writes a NNN-zero-padded photo', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    await runAddCount({
      n: 87,
      photoPath,
      date: '2026-05-03',
      whisper: 'parking sign in astoria',
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })

    const m = JSON.parse(readFileSync('data/manifest.json', 'utf8')) as Manifest
    expect(m.entries).toHaveLength(1)
    const e = m.entries[0]
    if (e?.type === 'count') {
      expect(e.n).toBe(87)
      expect(e.url).toBe('https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/087-2026-05-03.jpg')
      expect(e.whisper).toBe('parking sign in astoria')
    }
    expect(existsSync('photos/count/087-2026-05-03.jpg')).toBe(true)
  }, 30_000)

  it('rejects out-of-range n', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    await expect(runAddCount({
      n: 217,
      photoPath,
      date: '2026-05-03',
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })).rejects.toThrow(/0-216/)
  })

  it('rejects whisper longer than 240 chars', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    await expect(runAddCount({
      n: 5,
      photoPath,
      date: '2026-05-03',
      whisper: 'x'.repeat(241),
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })).rejects.toThrow(/240/)
  })

  it('rejects duplicate n', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    writeFileSync('data/manifest.json', JSON.stringify({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'count', n: 5, date: '2026-04-01',
        url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/005-2026-04-01.jpg',
        w: 100, h: 100,
      }],
    }))
    await expect(runAddCount({
      n: 5,
      photoPath,
      date: '2026-05-03',
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })).rejects.toThrow(/duplicate count/i)
  })
})
