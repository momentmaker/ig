#!/usr/bin/env tsx
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Manifest, Entry, CountEntry } from '../utils/manifestSchema'

const SITE_URL = 'https://ig.fz.ax'
const FEED_LIMIT = 50
const TZ_OFFSET = '-04:00'

function urlForEntry(e: Entry): string {
  if (e.type === 'sky') {
    const [y, m, d] = e.date.split('-')
    return `${SITE_URL}/sky/${y}/${m}/${d}`
  }
  return `${SITE_URL}/count/${e.n}`
}

function titleForEntry(e: Entry): string {
  return e.type === 'sky' ? `sky ${e.date}` : `the number ${e.n}`
}

function sortedDescByDateAndType(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    return 0
  })
}

interface FeedItem {
  id: string
  url: string
  date_published: string
  title: string
  image: string
  content_text?: string
}

function itemFor(e: Entry): FeedItem {
  const url = urlForEntry(e)
  const item: FeedItem = {
    id: url,
    url,
    date_published: `${e.date}T12:00:00${TZ_OFFSET}`,
    title: titleForEntry(e),
    image: e.url,
  }
  if (e.type === 'count' && (e as CountEntry).whisper !== undefined) {
    item.content_text = (e as CountEntry).whisper!
  }
  return item
}

export async function buildFeed(manifestPath = 'data/manifest.json', outPath = '.output/public/feed.json'): Promise<void> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest
  const items = sortedDescByDateAndType(manifest.entries).slice(0, FEED_LIMIT).map(itemFor)
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'ig.fz.ax',
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feed.json`,
    description: 'noticing what was previously invisible',
    authors: [{ name: 'fz.ax' }],
    items,
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(feed, null, 2))
}

async function main(): Promise<void> {
  await buildFeed()
  console.log('feed: wrote .output/public/feed.json')
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
