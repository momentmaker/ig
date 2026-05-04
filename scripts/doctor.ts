#!/usr/bin/env tsx
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { validateManifest, type Manifest } from '../utils/manifestSchema'

export interface DoctorReport {
  skyCount: number
  countCount: number
  errors: string[]
}

export interface DoctorOptions {
  manifestPath?: string
}

export function runDoctor(opts: DoctorOptions = {}): DoctorReport {
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const errors: string[] = []
  let manifest: Manifest = { version: 1, license: 'CC0-1.0', entries: [] }
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
    validateManifest(parsed)
    manifest = parsed
  }
  catch (err) {
    errors.push((err as Error).message)
  }
  return {
    skyCount: manifest.entries.filter(e => e.type === 'sky').length,
    countCount: manifest.entries.filter(e => e.type === 'count').length,
    errors,
  }
}

function main(): void {
  const manifestPath = 'data/manifest.json'
  const report = runDoctor({ manifestPath })
  console.log(`checking ${manifestPath}`)
  console.log(`sky entries:   ${report.skyCount}`)
  console.log(`count entries: ${report.countCount} / 217`)
  if (report.errors.length > 0) {
    console.log('errors:')
    for (const e of report.errors) console.log(`  - ${e}`)
    process.exit(1)
  }
  console.log('manifest valid')
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
