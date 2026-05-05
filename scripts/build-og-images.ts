#!/usr/bin/env tsx
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeOgImage } from './lib/og-image'
import { relPathFromUrl } from './lib/photo-store'
import type { Manifest, Entry } from '../utils/manifestSchema'

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

async function main(): Promise<void> {
  const result = await buildOgImages()
  console.log(`og-images: wrote ${result.written}, skipped ${result.skipped}, failed ${result.failed}`)
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
