import { describe, test, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFeed } from '~/scripts/build-feed'

const TMP = mkdtempSync(join(tmpdir(), 'feed-test-'))
afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('buildFeed', () => {
  test('writes valid JSON Feed v1.1 envelope', async () => {
    const out = join(TMP, 'feed.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(feed.title).toBe('ig.fz.ax')
    expect(feed.home_page_url).toBe('https://ig.fz.ax/')
    expect(feed.feed_url).toBe('https://ig.fz.ax/feed.json')
    expect(feed.description).toBe('noticing what was previously invisible')
    expect(Array.isArray(feed.items)).toBe(true)
  })

  test('sorts entries desc by date with type tiebreaker (count before sky)', async () => {
    const out = join(TMP, 'feed-sort.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    expect(feed.items[0].id).toBe('https://ig.fz.ax/count/47')
    expect(feed.items[1].id).toBe('https://ig.fz.ax/sky/2026/05/04')
    expect(feed.items[2].id).toBe('https://ig.fz.ax/count/1')
    expect(feed.items[3].id).toBe('https://ig.fz.ax/sky/2026/05/03')
    expect(feed.items[4].id).toBe('https://ig.fz.ax/sky/2026/05/02')
  })

  test('item shape includes id, url, date_published, title, image', async () => {
    const out = join(TMP, 'feed-shape.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    const sky = feed.items.find((it: { id: string }) => it.id.includes('sky'))
    expect(sky.url).toMatch(/^https:\/\/ig\.fz\.ax\/sky\//)
    expect(sky.date_published).toMatch(/^\d{4}-\d{2}-\d{2}T12:00:00/)
    expect(sky.title).toMatch(/^sky \d{4}-\d{2}-\d{2}$/)
    expect(sky.image).toMatch(/^https:\/\/cdn\.jsdelivr\.net/)
  })

  test('count entry includes content_text when whisper present', async () => {
    const out = join(TMP, 'feed-whisper.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    const c47 = feed.items.find((it: { id: string }) => it.id.endsWith('/47'))
    expect(c47.content_text).toBe('found on a fire hydrant')
    const c1 = feed.items.find((it: { id: string }) => it.id.endsWith('/1'))
    expect(c1.content_text).toBeUndefined()
  })

  test('slices to 50 most-recent entries when manifest has > 50', async () => {
    const out = join(TMP, 'feed-large.json')
    await buildFeed('tests/fixtures/manifest-feed-large.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    expect(feed.items.length).toBe(50)
    const dates = feed.items.map((it: { date_published: string }) => it.date_published.slice(0, 10))
    const sorted = [...dates].sort().reverse()
    expect(dates).toEqual(sorted)
  })
})
