import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { sortEntries, validateManifest, type Entry, type Manifest } from '../../utils/manifestSchema'

export const MANIFEST_INDENT = 2

export function loadManifest(path: string): Manifest {
  const raw = readFileSync(path, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch (err) {
    throw new Error(`failed to parse ${path}: ${(err as Error).message}`)
  }
  validateManifest(parsed)
  return parsed
}

export function saveManifest(path: string, manifest: Manifest): void {
  const sorted: Manifest = {
    ...manifest,
    entries: sortEntries(manifest.entries),
  }
  validateManifest(sorted)
  const text = JSON.stringify(sorted, null, MANIFEST_INDENT) + '\n'
  // Atomic write — temp + rename. SIGINT/crash mid-write cannot leave
  // data/manifest.json truncated. POSIX rename is atomic on the same fs.
  const tmp = `${path}.tmp`
  writeFileSync(tmp, text, 'utf8')
  renameSync(tmp, path)
}

export function appendEntry(path: string, entry: Entry): Manifest {
  const m = loadManifest(path)
  m.entries.push(entry)
  saveManifest(path, m)
  return loadManifest(path)
}
