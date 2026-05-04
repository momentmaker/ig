#!/usr/bin/env tsx
import { fileURLToPath } from 'node:url'
import { loadManifest, saveManifest } from './lib/manifest'
import type { IgConfig } from '../utils/config'
import { loadConfig } from './lib/config-loader'
import type { Entry, Manifest } from '../utils/manifestSchema'
import { Storage } from '@google-cloud/storage'

interface MinimalStorage {
  bucket: (name: string) => {
    file: (name: string) => {
      delete: () => Promise<unknown>
    }
  }
}

export interface RemoveOptions {
  type: 'sky' | 'count'
  id: string
  manifestPath?: string
  storage?: MinimalStorage
  config?: IgConfig
}

function objectNameFor(entry: Entry): string {
  if (entry.type === 'sky') return `${entry.date}.jpg`
  const padded = entry.n.toString().padStart(3, '0')
  return `${padded}-${entry.date}.jpg`
}

export async function runRemove(opts: RemoveOptions): Promise<Entry> {
  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const storage = opts.storage ?? (new Storage() as unknown as MinimalStorage)

  const manifest = loadManifest(manifestPath)
  let target: Entry | undefined
  if (opts.type === 'sky') {
    target = manifest.entries.find(e => e.type === 'sky' && e.date === opts.id)
  }
  else {
    const n = Number(opts.id)
    target = manifest.entries.find(e => e.type === 'count' && e.n === n)
  }
  if (target === undefined) {
    throw new Error(`entry not found: type=${opts.type} id=${opts.id}`)
  }

  // Manifest first, then GCS. If the GCS delete fails after the manifest
  // is saved, we leave a CC0-licensed orphan in the bucket — recoverable by
  // name. The opposite order would leave a 404 URL in the manifest, which
  // breaks the rendered site.
  const next: Manifest = {
    ...manifest,
    entries: manifest.entries.filter(e => e !== target),
  }
  saveManifest(manifestPath, next)

  const bucket = target.type === 'sky' ? config.skyBucket : config.countBucket
  try {
    await storage.bucket(bucket).file(objectNameFor(target)).delete()
  }
  catch (err) {
    console.error(`warning: manifest cleared but GCS delete failed for ${objectNameFor(target)}: ${(err as Error).message}`)
  }
  return target
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('usage: pnpm remove <type> <id>')
    process.exit(1)
  }
  const type = args[0] as 'sky' | 'count'
  if (type !== 'sky' && type !== 'count') {
    console.error(`type must be 'sky' or 'count'`)
    process.exit(1)
  }
  const id = args[1]!
  try {
    const removed = await runRemove({ type, id })
    console.log(`removed ${type} ${id}: ${removed.url}`)
  }
  catch (err) {
    console.error((err as Error).message)
    process.exit(1)
  }
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
