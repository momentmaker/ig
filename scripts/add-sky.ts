#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { processPhoto } from './lib/pipeline'
import { uploadObject, type MinimalStorage } from './lib/gcs'
import { loadManifest, saveManifest } from './lib/manifest'
import { isSolstice } from '../utils/solstice'
import { loadConfig, type IgConfig } from '../utils/config'
import type { SkyEntry, Manifest } from '../utils/manifestSchema'
import { Storage } from '@google-cloud/storage'

export interface AddSkyOptions {
  photoPath: string
  date?: string
  push?: boolean
  manifestPath?: string
  storage?: MinimalStorage
  config?: IgConfig
}

function resolveDate(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function runAddSky(opts: AddSkyOptions): Promise<SkyEntry> {
  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const storage = opts.storage ?? (new Storage() as unknown as MinimalStorage)

  const photo = readFileSync(opts.photoPath)
  const processed = await processPhoto(photo)

  const date = opts.date ?? processed.originalDate ?? resolveDate(new Date(), config.timezone)
  if (!DATE_RE.test(date)) {
    throw new Error(`invalid date "${date}", expected YYYY-MM-DD`)
  }

  const manifest = loadManifest(manifestPath)
  if (manifest.entries.some(e => e.type === 'sky' && e.date === date)) {
    throw new Error(`duplicate sky entry for date ${date}`)
  }

  const objectName = `${date}.jpg`
  const url = await uploadObject(config.skyBucket, objectName, processed.buffer, storage)

  const entry: SkyEntry = {
    type: 'sky',
    date,
    url,
    w: processed.width,
    h: processed.height,
    color: processed.dominantColor,
    solstice: isSolstice(date),
  }
  const next: Manifest = { ...manifest, entries: [...manifest.entries, entry] }
  saveManifest(manifestPath, next)
  return entry
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('usage: pnpm add-sky <photo-path> [--date YYYY-MM-DD] [--push]')
    process.exit(1)
  }
  const photoPath = args[0]!
  const dateIdx = args.indexOf('--date')
  const date = dateIdx >= 0 ? args[dateIdx + 1] : undefined
  try {
    const entry = await runAddSky({ photoPath, date })
    console.log(`✓ sky added for ${entry.date}: ${entry.url}`)
  }
  catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('add-sky.ts') || process.argv[1]?.endsWith('add-sky.js')) {
  await main()
}
