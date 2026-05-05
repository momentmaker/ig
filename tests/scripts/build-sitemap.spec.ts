import { describe, test, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSitemap } from '~/scripts/build-sitemap'

const TMP = mkdtempSync(join(tmpdir(), 'sitemap-test-'))
afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('buildSitemap', () => {
  test('emits valid urlset with all expected URLs', async () => {
    const out = join(TMP, 'sitemap.xml')
    await buildSitemap('tests/fixtures/manifest-sitemap.json', out)
    const xml = readFileSync(out, 'utf8')
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://ig.fz.ax/</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/sky</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/count</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/sky/2026/05/04</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/sky/2026/05/03</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/count/47</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/feed.json</loc>')
  })

  test('lastmod set to max sky date for /sky', async () => {
    const out = join(TMP, 'sitemap-lastmod.xml')
    await buildSitemap('tests/fixtures/manifest-sitemap.json', out)
    const xml = readFileSync(out, 'utf8')
    const m = xml.match(/<url>\s*<loc>https:\/\/ig\.fz\.ax\/sky<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('2026-05-04')
  })

  test('per-entry lastmod equals entry date', async () => {
    const out = join(TMP, 'sitemap-perentry.xml')
    await buildSitemap('tests/fixtures/manifest-sitemap.json', out)
    const xml = readFileSync(out, 'utf8')
    const m = xml.match(/<url>\s*<loc>https:\/\/ig\.fz\.ax\/sky\/2026\/05\/03<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('2026-05-03')
  })
})
