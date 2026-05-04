import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runDoctor } from '~/scripts/doctor'

function tempManifest(content: object): string {
  const dir = mkdtempSync(join(tmpdir(), 'ig-dr-'))
  const path = join(dir, 'manifest.json')
  writeFileSync(path, JSON.stringify(content))
  return path
}

describe('runDoctor', () => {
  it('reports counts for an empty manifest', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    const report = runDoctor({ manifestPath: path })
    expect(report.skyCount).toBe(0)
    expect(report.countCount).toBe(0)
    expect(report.errors).toEqual([])
    rmSync(path, { force: true })
  })

  it('reports counts for a populated manifest', () => {
    const path = tempManifest({
      version: 1, license: 'CC0-1.0',
      entries: [
        { type: 'sky', date: '2026-05-03', url: 'https://storage.googleapis.com/sky-photos/x.jpg', w: 100, h: 100, color: '#aabbcc', solstice: false },
        { type: 'sky', date: '2026-05-04', url: 'https://storage.googleapis.com/sky-photos/y.jpg', w: 100, h: 100, color: '#aabbcc', solstice: false },
        { type: 'count', n: 5, date: '2026-04-01', url: 'https://storage.googleapis.com/count-photos/005-x.jpg', w: 100, h: 100 },
      ],
    })
    const report = runDoctor({ manifestPath: path })
    expect(report.skyCount).toBe(2)
    expect(report.countCount).toBe(1)
    expect(report.errors).toEqual([])
    rmSync(path, { force: true })
  })

  it('reports errors for invalid manifest', () => {
    const path = tempManifest({ version: 99, license: 'CC0-1.0', entries: [] })
    const report = runDoctor({ manifestPath: path })
    expect(report.errors.length).toBeGreaterThan(0)
    rmSync(path, { force: true })
  })
})
