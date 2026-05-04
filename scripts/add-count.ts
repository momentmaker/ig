#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { processPhoto } from './lib/pipeline'
import { uploadObject, type MinimalStorage } from './lib/gcs'
import { loadManifest, saveManifest } from './lib/manifest'
import { loadConfig, type IgConfig } from '../utils/config'
import type { CountEntry, Manifest } from '../utils/manifestSchema'
import { Storage } from '@google-cloud/storage'

export interface AddCountOptions {
  n: number
  photoPath: string
  date?: string
  whisper?: string
  manifestPath?: string
  storage?: MinimalStorage
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

export async function runAddCount(opts: AddCountOptions): Promise<CountEntry> {
  if (!Number.isInteger(opts.n) || opts.n < 0 || opts.n > 216) {
    throw new Error(`count.n must be an integer in 0-216, got ${opts.n}`)
  }
  if (opts.whisper !== undefined && opts.whisper.length > 240) {
    throw new Error(`whisper too long: ${opts.whisper.length} > 240`)
  }

  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const storage = opts.storage ?? (new Storage() as unknown as MinimalStorage)

  // Fast-path duplicate check on n (always known — primary identifier).
  const earlyManifest = loadManifest(manifestPath)
  if (earlyManifest.entries.some(e => e.type === 'count' && e.n === opts.n)) {
    throw new Error(`duplicate count entry for n=${opts.n}`)
  }

  if (opts.date !== undefined) {
    assertValidDate(opts.date)
  }

  const photo = readFileSync(opts.photoPath)
  const processed = await processPhoto(photo)

  const date = opts.date ?? processed.originalDate ?? resolveDate(new Date(), config.timezone)
  assertValidDate(date)

  // Re-check manifest in case of race (defensive — single-threaded CLI but cheap).
  const manifest = loadManifest(manifestPath)
  if (manifest.entries.some(e => e.type === 'count' && e.n === opts.n)) {
    throw new Error(`duplicate count entry for n=${opts.n}`)
  }

  const padded = opts.n.toString().padStart(3, '0')
  const objectName = `${padded}-${date}.jpg`
  const url = await uploadObject(config.countBucket, objectName, processed.buffer, storage)

  const entry: CountEntry = {
    type: 'count',
    n: opts.n,
    date,
    url,
    w: processed.width,
    h: processed.height,
    ...(opts.whisper !== undefined ? { whisper: opts.whisper } : {}),
  }
  const next: Manifest = { ...manifest, entries: [...manifest.entries, entry] }
  saveManifest(manifestPath, next)
  return entry
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('usage: pnpm add-count <number> <photo-path> [--whisper "text"] [--date YYYY-MM-DD]')
    process.exit(1)
  }
  const n = Number(args[0])
  const photoPath = args[1]!
  const dateIdx = args.indexOf('--date')
  const whisperIdx = args.indexOf('--whisper')
  const date = dateIdx >= 0 ? args[dateIdx + 1] : undefined
  const whisper = whisperIdx >= 0 ? args[whisperIdx + 1] : undefined
  try {
    const entry = await runAddCount({ n, photoPath, date, whisper })
    console.log(`count ${entry.n} added: ${entry.url}`)
  }
  catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
