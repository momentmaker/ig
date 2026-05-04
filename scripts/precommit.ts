#!/usr/bin/env tsx
import { execFileSync } from 'node:child_process'
import { validateManifest, type Manifest } from '../utils/manifestSchema'
import type { IgConfig } from '../utils/config'
import { loadConfig } from './lib/config-loader'

const MANIFEST_PATH = 'data/manifest.json'

function fail(msg: string): never {
  console.error(`pre-commit: ${msg}`)
  process.exit(1)
}

function stagedFiles(): string[] {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
    return out.split('\n').filter(s => s.length > 0)
  }
  catch (err) {
    fail(`failed to read git index: ${(err as Error).message}`)
  }
}

function readStagedManifest(): string {
  try {
    return execFileSync('git', ['show', `:${MANIFEST_PATH}`], { encoding: 'utf8' })
  }
  catch (err) {
    fail(`failed to read staged ${MANIFEST_PATH}: ${(err as Error).message}`)
  }
}

if (!stagedFiles().includes(MANIFEST_PATH)) {
  process.exit(0)
}

// Validate the *staged blob* (what will actually land), not the working-tree
// copy — the user may have edited the file after `git add`.
let m: Manifest
try {
  const parsed: unknown = JSON.parse(readStagedManifest())
  validateManifest(parsed)
  m = parsed
}
catch (err) {
  fail(`${MANIFEST_PATH}: ${(err as Error).message}`)
}

let config: IgConfig
try {
  config = loadConfig()
}
catch (err) {
  fail(`config: ${(err as Error).message}`)
}

const allowedHosts = [
  `https://storage.googleapis.com/${config.skyBucket}/`,
  `https://storage.googleapis.com/${config.countBucket}/`,
]
for (const entry of m.entries) {
  if (!allowedHosts.some(p => entry.url.startsWith(p))) {
    fail(`${MANIFEST_PATH}: url not in configured buckets [${allowedHosts.join(', ')}]: ${entry.url}`)
  }
}

console.log(`pre-commit: manifest valid (${m.entries.length} entries)`)
process.exit(0)
