export interface SkyEntry {
  type: 'sky'
  date: string
  url: string
  w: number
  h: number
  color: string
  solstice: boolean
}

export interface CountEntry {
  type: 'count'
  n: number
  date: string
  url: string
  w: number
  h: number
  whisper?: string
}

export type Entry = SkyEntry | CountEntry

export interface Manifest {
  version: 1
  license: 'CC0-1.0'
  entries: Entry[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function validateEntry(entry: Entry): void {
  if (entry.type !== 'sky' && entry.type !== 'count') {
    throw new Error(`entry.type must be 'sky' or 'count', got ${JSON.stringify((entry as { type: unknown }).type)}`)
  }
  if (typeof entry.date !== 'string' || !DATE_RE.test(entry.date)) {
    throw new Error(`entry.date must be YYYY-MM-DD, got ${JSON.stringify(entry.date)}`)
  }
  if (typeof entry.url !== 'string' || !entry.url.startsWith('https://')) {
    throw new Error(`entry.url must start with https://, got ${JSON.stringify(entry.url)}`)
  }
  if (typeof entry.w !== 'number' || entry.w <= 0) {
    throw new Error(`entry.w must be a positive number, got ${JSON.stringify(entry.w)}`)
  }
  if (typeof entry.h !== 'number' || entry.h <= 0) {
    throw new Error(`entry.h must be a positive number, got ${JSON.stringify(entry.h)}`)
  }
  if (entry.type === 'sky') {
    if (typeof entry.color !== 'string' || !HEX_COLOR_RE.test(entry.color)) {
      throw new Error(`sky.color must be #rrggbb, got ${JSON.stringify(entry.color)}`)
    }
    if (typeof entry.solstice !== 'boolean') {
      throw new Error(`sky.solstice must be boolean, got ${JSON.stringify(entry.solstice)}`)
    }
  }
  if (entry.type === 'count') {
    if (!Number.isInteger(entry.n)) {
      throw new Error(`count.n must be an integer, got ${JSON.stringify(entry.n)}`)
    }
    if (entry.n < 0 || entry.n > 216) {
      throw new Error(`count.n must be 0-216, got ${entry.n}`)
    }
    if (entry.whisper !== undefined) {
      if (typeof entry.whisper !== 'string') {
        throw new Error(`count.whisper must be string when present`)
      }
      if (entry.whisper.length > 240) {
        throw new Error(`count.whisper must be ≤ 240 chars, got ${entry.whisper.length}`)
      }
    }
  }
}

export function validateManifest(m: Manifest): void {
  if (m.version !== 1) {
    throw new Error(`manifest.version must be 1, got ${JSON.stringify(m.version)}`)
  }
  if (m.license !== 'CC0-1.0') {
    throw new Error(`manifest.license must be 'CC0-1.0', got ${JSON.stringify(m.license)}`)
  }
  if (!Array.isArray(m.entries)) {
    throw new Error(`manifest.entries must be an array`)
  }
  const skyDates = new Set<string>()
  const countNs = new Set<number>()
  for (const entry of m.entries) {
    validateEntry(entry)
    if (entry.type === 'sky') {
      if (skyDates.has(entry.date)) {
        throw new Error(`duplicate sky entry for date ${entry.date}`)
      }
      skyDates.add(entry.date)
    }
    if (entry.type === 'count') {
      if (countNs.has(entry.n)) {
        throw new Error(`duplicate count entry for n=${entry.n}`)
      }
      countNs.add(entry.n)
    }
  }
}

export function sortEntries(entries: Entry[]): Entry[] {
  const copy = [...entries]
  copy.sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    if (a.type === 'count' && b.type === 'count') return a.n - b.n
    if (a.type === 'sky' && b.type === 'sky') return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    return 0
  })
  return copy
}
