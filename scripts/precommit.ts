#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { validateManifest, type Manifest } from '../utils/manifestSchema'
import { loadConfig } from '../utils/config'

const MANIFEST_PATH = 'data/manifest.json'

function staged(file: string): boolean {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
    return out.split('\n').includes(file)
  }
  catch {
    return false
  }
}

function fail(msg: string): never {
  console.error(`pre-commit: ${msg}`)
  process.exit(1)
}

if (!existsSync(MANIFEST_PATH)) {
  process.exit(0)
}

if (!staged(MANIFEST_PATH)) {
  process.exit(0)
}

let m: Manifest
try {
  const parsed: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  validateManifest(parsed)
  m = parsed
}
catch (err) {
  fail(`${MANIFEST_PATH}: ${(err as Error).message}`)
}

const config = loadConfig()
const allowedHosts = [
  `https://storage.googleapis.com/${config.skyBucket}/`,
  `https://storage.googleapis.com/${config.countBucket}/`,
]
for (const entry of m.entries) {
  if (!allowedHosts.some(p => entry.url.startsWith(p))) {
    fail(`${MANIFEST_PATH}: entry url does not point to a configured bucket: ${entry.url}`)
  }
}

console.log(`pre-commit: manifest valid (${m.entries.length} entries)`)
process.exit(0)
