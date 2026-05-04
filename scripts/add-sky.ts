#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { processPhoto } from './lib/pipeline'
import { savePhoto } from './lib/photo-store'
import { loadManifest, saveManifest } from './lib/manifest'
import { isSolstice } from '../utils/solstice'
import type { IgConfig } from '../utils/config'
import { loadConfig } from './lib/config-loader'
import type { SkyEntry, Manifest } from '../utils/manifestSchema'

export interface AddSkyOptions {
  photoPath: string
  date?: string
  manifestPath?: string
  config?: IgConfig
}

function resolveDate(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function assertValidDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new Error(`invalid date "${date}", expected YYYY-MM-DD`)
  }
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
    throw new Error(`invalid date "${date}", expected real YYYY-MM-DD`)
  }
}

export async function runAddSky(opts: AddSkyOptions): Promise<SkyEntry> {
  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'

  if (opts.date !== undefined) {
    assertValidDate(opts.date)
    const m = loadManifest(manifestPath)
    if (m.entries.some(e => e.type === 'sky' && e.date === opts.date)) {
      throw new Error(`duplicate sky entry for date ${opts.date}`)
    }
  }

  const photo = readFileSync(opts.photoPath)
  const processed = await processPhoto(photo)

  const date = opts.date ?? processed.originalDate ?? resolveDate(new Date(), config.timezone)
  assertValidDate(date)

  const manifest = loadManifest(manifestPath)
  if (manifest.entries.some(e => e.type === 'sky' && e.date === date)) {
    throw new Error(`duplicate sky entry for date ${date}`)
  }

  const url = savePhoto(processed.buffer, `sky/${date}.jpg`)

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
    console.error('usage: pnpm add-sky <photo-path> [--date YYYY-MM-DD]')
    process.exit(1)
  }
  const photoPath = args[0]!
  const dateIdx = args.indexOf('--date')
  const date = dateIdx >= 0 ? args[dateIdx + 1] : undefined
  try {
    const entry = await runAddSky({ photoPath, date })
    console.log(`sky added for ${entry.date}: ${entry.url}`)
  }
  catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
