import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Photos live in /photos/<type>/ and are served via jsDelivr's git CDN.
// jsDelivr's @latest tag flushes its cache ~12h after a new commit; for the
// append-only nature of sky/count photos that lag is acceptable.
export const PHOTOS_DIR = 'photos'
export const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos'

export function urlFor(relPath: string): string {
  return `${JSDELIVR_BASE}/${relPath}`
}

export function savePhoto(buffer: Buffer, relPath: string): string {
  const fullPath = join(PHOTOS_DIR, relPath)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, buffer)
  return urlFor(relPath)
}

export function deletePhoto(relPath: string): boolean {
  const fullPath = join(PHOTOS_DIR, relPath)
  if (!existsSync(fullPath)) return false
  rmSync(fullPath, { force: true })
  return true
}

// Rebuild the relPath for a manifest entry's URL. Used by `pnpm rm-photo` to
// locate the file from a manifest entry. Returns null if the URL is not a
// jsDelivr URL into our own repo (e.g., legacy entries).
export function relPathFromUrl(url: string): string | null {
  if (!url.startsWith(JSDELIVR_BASE + '/')) return null
  return url.slice(JSDELIVR_BASE.length + 1)
}
