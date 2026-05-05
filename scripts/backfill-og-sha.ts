#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadManifest, saveManifest } from './lib/manifest'
import { relPathFromUrl } from './lib/photo-store'

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function backfillOgSha(manifestPath = 'data/manifest.json'): Promise<{ updated: number }> {
  const manifest = loadManifest(manifestPath)
  let updated = 0
  const next = manifest.entries.map((entry) => {
    if (entry.ogSha !== undefined) return entry
    const rel = relPathFromUrl(entry.url)
    if (rel === null) {
      throw new Error(`backfill-og-sha: cannot resolve local path for ${entry.url}`)
    }
    const bytes = readFileSync(join('photos', rel))
    const ogSha = sha256(bytes)
    updated++
    return { ...entry, ogSha }
  })
  saveManifest(manifestPath, { ...manifest, entries: next })
  return { updated }
}

async function main(): Promise<void> {
  const r = await backfillOgSha()
  console.log(`backfilled ogSha on ${r.updated} entries`)
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
