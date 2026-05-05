#!/usr/bin/env tsx
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Manifest, Entry, SkyEntry, CountEntry } from '../utils/manifestSchema'

const SITE_URL = 'https://ig.fz.ax'

function maxDate(entries: Entry[]): string | null {
  if (entries.length === 0) return null
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0]!.date
}

function urlEl(loc: string, lastmod: string | null): string {
  if (lastmod === null) return `  <url><loc>${loc}</loc></url>`
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
}

export async function buildSitemap(manifestPath = 'data/manifest.json', outPath = '.output/public/sitemap.xml'): Promise<void> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest
  const skies = manifest.entries.filter((e): e is SkyEntry => e.type === 'sky')
  const counts = manifest.entries.filter((e): e is CountEntry => e.type === 'count')

  const homeMod = maxDate(manifest.entries)
  const skyMod = maxDate(skies)
  const countMod = maxDate(counts)

  const urls: string[] = [
    urlEl(`${SITE_URL}/`, homeMod),
    urlEl(`${SITE_URL}/sky`, skyMod),
    urlEl(`${SITE_URL}/count`, countMod),
    urlEl(`${SITE_URL}/feed.json`, homeMod),
  ]
  for (const e of skies) {
    const [y, m, d] = e.date.split('-')
    urls.push(urlEl(`${SITE_URL}/sky/${y}/${m}/${d}`, e.date))
  }
  for (const e of counts) {
    urls.push(urlEl(`${SITE_URL}/count/${e.n}`, e.date))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, xml)
}

async function main(): Promise<void> {
  await buildSitemap()
  console.log('sitemap: wrote .output/public/sitemap.xml')
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
