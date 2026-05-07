#!/usr/bin/env tsx
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeOgImage, composeHomeOgImage } from './lib/og-image'
import { relPathFromUrl } from './lib/photo-store'
import { homeOgKey } from '../composables/useManifest'
import { HOME_OG_PANELS } from '../utils/copy'
import type { Manifest, Entry, SkyEntry, CountEntry } from '../utils/manifestSchema'

const OUT_DIR = '.output/public/og'

function captionFor(entry: Entry): string {
  return entry.type === 'sky' ? `sky ${entry.date}` : `the number ${entry.n}`
}

export async function buildOgImages(manifestPath = 'data/manifest.json', outDir = OUT_DIR): Promise<{ written: number, skipped: number, failed: number }> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest

  mkdirSync(outDir, { recursive: true })

  let written = 0
  let skipped = 0
  let failed = 0

  for (const entry of manifest.entries) {
    if (entry.ogSha === undefined) {
      console.warn(`og-image: skipping entry without ogSha: ${entry.type} ${entry.type === 'sky' ? entry.date : entry.n}`)
      failed++
      continue
    }
    const outPath = join(outDir, `${entry.ogSha}.png`)
    if (existsSync(outPath)) {
      skipped++
      continue
    }
    const rel = relPathFromUrl(entry.url)
    if (rel === null) {
      console.warn(`og-image: cannot resolve local path for ${entry.url}`)
      failed++
      continue
    }
    const photoPath = join('photos', rel)
    try {
      await composeOgImage({
        photoPath,
        caption: captionFor(entry),
        outPath,
        solstice: entry.type === 'sky' && entry.solstice === true,
      })
      written++
    }
    catch (err) {
      console.warn(`og-image: failed for entry: ${(err as Error).message}`)
      failed++
    }
  }

  return { written, skipped, failed }
}

function pickLatestSky(entries: Entry[]): SkyEntry | null {
  const skies = entries.filter((e): e is SkyEntry => e.type === 'sky')
  skies.sort((a, b) => b.date.localeCompare(a.date))
  return skies[0] ?? null
}

function pickLatestCount(entries: Entry[]): CountEntry | null {
  const counts = entries.filter((e): e is CountEntry => e.type === 'count')
  counts.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.n - a.n
  })
  return counts[0] ?? null
}

export async function buildHomeOgImage(manifestPath = 'data/manifest.json', outDir = OUT_DIR): Promise<{ written: boolean, skipped: boolean, reason?: string }> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest

  const sky = pickLatestSky(manifest.entries)
  const count = pickLatestCount(manifest.entries)
  if (sky === null || count === null) {
    return { written: false, skipped: true, reason: 'missing latest sky or count' }
  }

  mkdirSync(outDir, { recursive: true })
  const key = homeOgKey(sky.ogSha, count.ogSha)
  const outPath = join(outDir, `${key}.png`)
  if (existsSync(outPath)) {
    return { written: false, skipped: true, reason: 'cached' }
  }

  const skyRel = relPathFromUrl(sky.url)
  const countRel = relPathFromUrl(count.url)
  if (skyRel === null || countRel === null) {
    return { written: false, skipped: true, reason: 'cannot resolve local photo paths' }
  }

  await composeHomeOgImage({
    sky: {
      photoPath: join('photos', skyRel),
      label: HOME_OG_PANELS.sky.label,
      description: HOME_OG_PANELS.sky.description,
      solstice: sky.solstice,
    },
    count: {
      photoPath: join('photos', countRel),
      label: HOME_OG_PANELS.count.label,
      description: HOME_OG_PANELS.count.description,
    },
    outPath,
  })
  return { written: true, skipped: false }
}

async function main(): Promise<void> {
  const result = await buildOgImages()
  console.log(`og-images: wrote ${result.written}, skipped ${result.skipped}, failed ${result.failed}`)
  const home = await buildHomeOgImage()
  if (home.written) console.log('og-images: wrote home composite')
  else console.log(`og-images: home composite skipped (${home.reason ?? 'unknown'})`)
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
