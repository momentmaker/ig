import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chdir, cwd } from 'node:process'
import { runAddSky } from '~/scripts/add-sky'
import type { Manifest } from '~/utils/manifestSchema'

const FIXTURE = join(cwd(), 'tests/fixtures/sample.jpg')

let workDir: string
let originalCwd: string

beforeEach(() => {
  originalCwd = cwd()
  workDir = mkdtempSync(join(tmpdir(), 'ig-cli-'))
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

describe('runAddSky', () => {
  it('appends a sky entry and writes the photo to /photos/sky/', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    await runAddSky({
      photoPath,
      date: '2026-05-04',
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })

    const m = JSON.parse(readFileSync('data/manifest.json', 'utf8')) as Manifest
    expect(m.entries).toHaveLength(1)
    const e = m.entries[0]
    expect(e?.type).toBe('sky')
    if (e?.type === 'sky') {
      expect(e.date).toBe('2026-05-04')
      expect(e.url).toBe('https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg')
      expect(e.color).toMatch(/^#[0-9a-f]{6}$/)
      expect(e.solstice).toBe(false)
      expect(e.ogSha).toMatch(/^[a-f0-9]{64}$/)
    }
    expect(existsSync('photos/sky/2026-05-04.jpg')).toBe(true)
  }, 30_000)

  it('rejects a duplicate sky date and does not write the photo file', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    writeFileSync('data/manifest.json', JSON.stringify({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'sky',
        date: '2026-05-04',
        url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
        w: 100, h: 100, color: '#aabbcc', solstice: false,
        ogSha: 'a'.repeat(64),
      }],
    }))

    await expect(runAddSky({
      photoPath,
      date: '2026-05-04',
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })).rejects.toThrow(/duplicate sky/i)
    expect(existsSync('photos/sky/2026-05-04.jpg')).toBe(false)
  }, 30_000)

  it('marks solstice photos with solstice: true', async () => {
    const photoPath = join(workDir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    await runAddSky({
      photoPath,
      date: '2026-12-21',
      manifestPath: 'data/manifest.json',
      config: { timezone: 'America/New_York' },
    })

    const m = JSON.parse(readFileSync('data/manifest.json', 'utf8')) as Manifest
    const e = m.entries[0]
    if (e?.type === 'sky') {
      expect(e.solstice).toBe(true)
      expect(e.ogSha).toMatch(/^[a-f0-9]{64}$/)
    }
    expect(existsSync('photos/sky/2026-12-21.jpg')).toBe(true)
  }, 30_000)
})
