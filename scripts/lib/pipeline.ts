import sharp from 'sharp'
import { exiftool } from 'exiftool-vendored'
import heicConvert from 'heic-convert'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface ProcessedPhoto {
  buffer: Buffer
  width: number
  height: number
  dominantColor: string
  originalDate: string | null
  originalTime: string | null
}

const MAX_EDGE = 1600
const TARGET_BYTES = 1_000_000
const MAX_BYTES = 1_200_000

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// HEIC/HEIF magic-byte sniff. The first 4 bytes are a box length (often 0x18)
// followed by 'ftyp' at offset 4..8 and a brand at offset 8..12. HEIC brands:
// heic, heix, hevc, hevx, mif1, msf1.
function isHeic(buf: Buffer): boolean {
  if (buf.length < 12) return false
  if (buf.toString('ascii', 4, 8) !== 'ftyp') return false
  const brand = buf.toString('ascii', 8, 12)
  return brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx' || brand === 'mif1' || brand === 'msf1'
}

async function exifTagsAt(path: string): Promise<Record<string, unknown>> {
  return await exiftool.read(path) as Record<string, unknown>
}

// Formats a UTC Date in the author timezone as YYYY-MM-DD and HH:MM. Uses
// Intl with en-CA which renders YYYY-MM-DD natively. Both date and time
// derive from the same instant — keeping them coherent for late-evening
// photos whose UTC date crosses midnight.
function formatInTz(d: Date, tz: string): { date: string, time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (type: string): string => parts.find(p => p.type === type)?.value ?? ''
  const yyyy = get('year')
  const mm = get('month')
  const dd = get('day')
  // Intl can return '24' for midnight in some locales; normalize to '00'.
  const hour = get('hour') === '24' ? '00' : get('hour')
  const minute = get('minute')
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hour}:${minute}` }
}

function parseExifDateTime(val: unknown, tz: string): { date: string | null, time: string | null } {
  if (val === null || val === undefined) return { date: null, time: null }
  if (typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate()
    if (Number.isNaN(d.getTime())) return { date: null, time: null }
    const { date, time } = formatInTz(d, tz)
    return { date, time }
  }
  // Fallback for raw string values: no TZ info available, return components
  // verbatim. Modern iPhones always emit ExifDateTime objects with offsets,
  // so this path is for legacy / unusual cameras only.
  if (typeof val === 'string') {
    const m = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2})/.exec(val)
    if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` }
    const dOnly = /^(\d{4}):(\d{2}):(\d{2})/.exec(val)
    if (dOnly) return { date: `${dOnly[1]}-${dOnly[2]}-${dOnly[3]}`, time: null }
  }
  return { date: null, time: null }
}

// exiftool-vendored only accepts file paths. When the caller hands us a path
// we reuse it directly; when they hand us a Buffer we materialize it briefly
// in a tmp dir and clean up unconditionally.
async function readOriginalDateTime(input: Buffer | string, tz: string): Promise<{ date: string | null, time: string | null }> {
  let path: string
  let cleanup: (() => void) | null = null
  if (typeof input === 'string') {
    path = input
  }
  else {
    const dir = mkdtempSync(join(tmpdir(), 'ig-pipe-'))
    path = join(dir, 'in.bin')
    writeFileSync(path, input)
    cleanup = (): void => rmSync(dir, { recursive: true, force: true })
  }
  try {
    const tags = await exifTagsAt(path)
    const source = tags.DateTimeOriginal ?? tags.CreateDate ?? null
    return parseExifDateTime(source, tz)
  }
  finally {
    cleanup?.()
  }
}

async function maybeConvertHeic(buf: Buffer): Promise<Buffer> {
  if (!isHeic(buf)) return buf
  const out = await heicConvert({ buffer: buf as unknown as ArrayBufferLike, format: 'JPEG', quality: 0.9 })
  return Buffer.from(out)
}

async function resizeToTarget(buf: Buffer): Promise<Buffer> {
  let last: Buffer | null = null
  for (const quality of [80, 70, 60]) {
    const out = await sharp(buf)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
    last = out
    if (out.byteLength <= TARGET_BYTES) return out
  }
  if (last === null) throw new Error('unreachable')
  return last
}

async function dominantColorOf(buf: Buffer): Promise<string> {
  const stats = await sharp(buf).stats()
  const c = stats.dominant
  return rgbToHex(c.r, c.g, c.b)
}

async function dimensionsOf(buf: Buffer): Promise<{ width: number, height: number }> {
  const md = await sharp(buf).metadata()
  return { width: md.width ?? 0, height: md.height ?? 0 }
}

export async function processPhoto(input: Buffer | string, opts: { tz: string }): Promise<ProcessedPhoto> {
  const inputBuf = typeof input === 'string' ? readFileSync(input) : input
  const { date: originalDate, time: originalTime } = await readOriginalDateTime(input, opts.tz)
  const jpegInput = await maybeConvertHeic(inputBuf)
  const resized = await resizeToTarget(jpegInput)
  if (resized.byteLength > MAX_BYTES) {
    throw new Error(`output exceeds max bytes after retries: ${resized.byteLength} > ${MAX_BYTES}`)
  }
  const { width, height } = await dimensionsOf(resized)
  const dominantColor = await dominantColorOf(resized)
  return { buffer: resized, width, height, dominantColor, originalDate, originalTime }
}
