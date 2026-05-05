#!/usr/bin/env tsx
import { fileURLToPath } from 'node:url'
import { cpSync, mkdirSync } from 'node:fs'
import { buildOgImages } from './build-og-images'

const OG_CACHE_DIR = '.og-cache'
const OG_OUTPUT_DIR = '.output/public/og'

async function main(): Promise<void> {
  console.log('postbuild: og-images')
  const og = await buildOgImages('data/manifest.json', OG_CACHE_DIR)
  mkdirSync(OG_OUTPUT_DIR, { recursive: true })
  cpSync(OG_CACHE_DIR, OG_OUTPUT_DIR, { recursive: true })
  console.log(`  wrote ${og.written}, skipped ${og.skipped}, failed ${og.failed}`)
  // Tasks 18 and 19 add buildFeed() and buildSitemap() calls here.
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((err) => {
    console.error('postbuild failed:', err)
    process.exit(1)
  })
}
