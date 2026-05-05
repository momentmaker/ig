export interface SkyEntry {
  type: 'sky'
  date: string
  url: string
  w: number
  h: number
  color: string
  solstice: boolean
  ogSha: string
}

export interface CountEntry {
  type: 'count'
  n: number
  date: string
  url: string
  w: number
  h: number
  whisper?: string
  ogSha: string
}

export type Entry = SkyEntry | CountEntry

export interface Manifest {
  version: 1
  license: 'CC0-1.0'
  entries: Entry[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const SHA256_RE = /^[a-f0-9]{64}$/

export function validateEntry(entry: unknown): asserts entry is Entry {
  if (entry === null || typeof entry !== 'object') {
    throw new Error(`entry must be an object, got ${JSON.stringify(entry)}`)
  }
  const e = entry as Record<string, unknown>
  if (e.type !== 'sky' && e.type !== 'count') {
    throw new Error(`entry.type must be 'sky' or 'count', got ${JSON.stringify(e.type)}`)
  }
  if (typeof e.date !== 'string' || !DATE_RE.test(e.date)) {
    throw new Error(`entry.date must be YYYY-MM-DD, got ${JSON.stringify(e.date)}`)
  }
  if (typeof e.url !== 'string' || !e.url.startsWith('https://')) {
    throw new Error(`entry.url must start with https://, got ${JSON.stringify(e.url)}`)
  }
  if (typeof e.w !== 'number' || !Number.isFinite(e.w) || e.w <= 0) {
    throw new Error(`entry.w must be a positive finite number, got ${JSON.stringify(e.w)}`)
  }
  if (typeof e.h !== 'number' || !Number.isFinite(e.h) || e.h <= 0) {
    throw new Error(`entry.h must be a positive finite number, got ${JSON.stringify(e.h)}`)
  }
  if (typeof e.ogSha !== 'string' || !SHA256_RE.test(e.ogSha)) {
    throw new Error(`entry.ogSha must be 64 hex chars, got ${JSON.stringify(e.ogSha)}`)
  }
  if (e.type === 'sky') {
    if (typeof e.color !== 'string' || !HEX_COLOR_RE.test(e.color)) {
      throw new Error(`sky.color must be #rrggbb, got ${JSON.stringify(e.color)}`)
    }
    if (typeof e.solstice !== 'boolean') {
      throw new Error(`sky.solstice must be boolean, got ${JSON.stringify(e.solstice)}`)
    }
  }
  if (e.type === 'count') {
    if (typeof e.n !== 'number' || !Number.isInteger(e.n)) {
      throw new Error(`count.n must be an integer, got ${JSON.stringify(e.n)}`)
    }
    if (e.n < 0 || e.n > 216) {
      throw new Error(`count.n must be 0-216, got ${e.n}`)
    }
    if (e.whisper !== undefined) {
      if (typeof e.whisper !== 'string') {
        throw new Error(`count.whisper must be string when present`)
      }
      if (e.whisper.length > 240) {
        throw new Error(`count.whisper must be ≤ 240 chars, got ${e.whisper.length}`)
      }
    }
  }
}

export function validateManifest(m: unknown): asserts m is Manifest {
  if (m === null || typeof m !== 'object') {
    throw new Error(`manifest must be an object, got ${JSON.stringify(m)}`)
  }
  const obj = m as Record<string, unknown>
  if (obj.version !== 1) {
    throw new Error(`manifest.version must be 1, got ${JSON.stringify(obj.version)}`)
  }
  if (obj.license !== 'CC0-1.0') {
    throw new Error(`manifest.license must be 'CC0-1.0', got ${JSON.stringify(obj.license)}`)
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error(`manifest.entries must be an array`)
  }
  const skyDates = new Set<string>()
  const countNs = new Set<number>()
  for (const entry of obj.entries) {
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
