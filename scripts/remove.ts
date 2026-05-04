#!/usr/bin/env tsx
import { fileURLToPath } from 'node:url'
import { loadManifest, saveManifest } from './lib/manifest'
import { deletePhoto, relPathFromUrl } from './lib/photo-store'
import type { Entry, Manifest } from '../utils/manifestSchema'

export interface RemoveOptions {
  type: 'sky' | 'count'
  id: string
  manifestPath?: string
}

export async function runRemove(opts: RemoveOptions): Promise<Entry> {
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'

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

  // Manifest first, then file. If the file delete fails after the manifest
  // is saved we leave a CC0-licensed orphan in /photos — recoverable by name.
  const next: Manifest = {
    ...manifest,
    entries: manifest.entries.filter(e => e !== target),
  }
  saveManifest(manifestPath, next)

  const relPath = relPathFromUrl(target.url)
  if (relPath !== null) {
    const removed = deletePhoto(relPath)
    if (!removed) {
      console.error(`warning: photo file not found at photos/${relPath} (manifest cleared)`)
    }
  }
  else {
    console.error(`warning: entry url is not a jsDelivr URL, leaving any external file untouched: ${target.url}`)
  }
  return target
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('usage: pnpm rm-photo <type> <id>')
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
