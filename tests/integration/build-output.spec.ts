import { describe, test, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs'

describe('build output', () => {
  beforeAll(() => {
    const r = spawnSync('pnpm', ['generate'], { stdio: 'inherit', timeout: 5 * 60_000 })
    if (r.status !== 0) throw new Error(`pnpm generate failed with status ${r.status}`)
  }, 10 * 60_000)

  test('feed.json exists and is valid JSON Feed v1.1', () => {
    expect(existsSync('.output/public/feed.json')).toBe(true)
    const feed = JSON.parse(readFileSync('.output/public/feed.json', 'utf8'))
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(Array.isArray(feed.items)).toBe(true)
    for (const item of feed.items) {
      expect(typeof item.id).toBe('string')
      expect(typeof item.url).toBe('string')
      expect(typeof item.date_published).toBe('string')
    }
  })

  test('sitemap.xml exists and contains urlset', () => {
    expect(existsSync('.output/public/sitemap.xml')).toBe(true)
    const xml = readFileSync('.output/public/sitemap.xml', 'utf8')
    expect(xml).toContain('<urlset')
    expect(xml).toContain('<loc>https://ig.fz.ax/</loc>')
  })

  test('og directory has at least one PNG per entry', () => {
    expect(existsSync('.output/public/og')).toBe(true)
    const manifest = JSON.parse(readFileSync('data/manifest.json', 'utf8'))
    const files = readdirSync('.output/public/og').filter(f => f.endsWith('.png'))
    expect(files.length).toBeGreaterThanOrEqual(manifest.entries.length)
    for (const f of files) {
      expect(statSync(`.output/public/og/${f}`).size).toBeGreaterThan(1000)
    }
  })

  test('og-brand.png exists in deployed public', () => {
    expect(existsSync('.output/public/og-brand.png')).toBe(true)
  })
})
