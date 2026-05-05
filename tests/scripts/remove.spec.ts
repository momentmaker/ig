import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { chdir, cwd } from 'node:process'
import { runRemove } from '~/scripts/remove'

let workDir: string
let originalCwd: string

beforeEach(() => {
  originalCwd = cwd()
  workDir = mkdtempSync(join(tmpdir(), 'ig-rm-'))
  mkdirSync(join(workDir, 'data'))
  chdir(workDir)
})

afterEach(() => {
  chdir(originalCwd)
  rmSync(workDir, { recursive: true, force: true })
})

function writeManifest(content: object): void {
  writeFileSync('data/manifest.json', JSON.stringify(content))
}

function writePhotoFile(relPath: string): void {
  const full = join('photos', relPath)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, 'fake jpeg bytes')
}

describe('runRemove', () => {
  it('removes a sky entry and deletes the photo file', async () => {
    writeManifest({
      version: 1, license: 'CC0-1.0',
      entries: [{
        type: 'sky', date: '2026-05-03',
        url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-03.jpg',
        w: 100, h: 100, color: '#aabbcc', solstice: false,
        ogSha: 'a'.repeat(64),
      }],
    })
    writePhotoFile('sky/2026-05-03.jpg')

    await runRemove({ type: 'sky', id: '2026-05-03', manifestPath: 'data/manifest.json' })

    const m = JSON.parse(readFileSync('data/manifest.json', 'utf8'))
    expect(m.entries).toEqual([])
    expect(existsSync('photos/sky/2026-05-03.jpg')).toBe(false)
  })

  it('removes a count entry and deletes the photo file', async () => {
    writeManifest({
      version: 1, license: 'CC0-1.0',
      entries: [{
        type: 'count', n: 87, date: '2026-05-03',
        url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/087-2026-05-03.jpg',
        w: 100, h: 100, ogSha: 'b'.repeat(64),
      }],
    })
    writePhotoFile('count/087-2026-05-03.jpg')

    await runRemove({ type: 'count', id: '87', manifestPath: 'data/manifest.json' })

    const m = JSON.parse(readFileSync('data/manifest.json', 'utf8'))
    expect(m.entries).toEqual([])
    expect(existsSync('photos/count/087-2026-05-03.jpg')).toBe(false)
  })

  it('throws when no matching entry exists and does not touch any photo file', async () => {
    writeManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    await expect(runRemove({
      type: 'sky',
      id: '2026-05-03',
      manifestPath: 'data/manifest.json',
    })).rejects.toThrow(/not found/i)
  })
})
