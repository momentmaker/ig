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
}

const MAX_EDGE = 1600
const TARGET_BYTES = 1_000_000
const MAX_BYTES = 1_200_000

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function readOriginalDate(buf: Buffer): Promise<string | null> {
  const dir = mkdtempSync(join(tmpdir(), 'ig-pipe-'))
  const path = join(dir, 'in.bin')
  writeFileSync(path, buf)
  let tags: Record<string, unknown>
  try {
    tags = await exiftool.read(path) as Record<string, unknown>
  }
  finally {
    rmSync(dir, { recursive: true, force: true })
  }
  const val = tags.DateTimeOriginal ?? tags.CreateDate ?? null
  if (val === null) return null
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate()
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }
  if (typeof val === 'string') {
    const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(val)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  return null
}

async function maybeConvertHeic(buf: Buffer): Promise<Buffer> {
  try {
    await sharp(buf).metadata()
    return buf
  }
  catch {
    const out = await heicConvert({ buffer: buf as unknown as ArrayBufferLike, format: 'JPEG', quality: 0.9 })
    return Buffer.from(out)
  }
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

export async function processPhoto(input: Buffer | string): Promise<ProcessedPhoto> {
  const inputBuf = typeof input === 'string' ? readFileSync(input) : input
  const originalDate = await readOriginalDate(inputBuf)
  const jpegInput = await maybeConvertHeic(inputBuf)
  const resized = await resizeToTarget(jpegInput)
  if (resized.byteLength > MAX_BYTES) {
    throw new Error(`output exceeds max bytes after retries: ${resized.byteLength} > ${MAX_BYTES}`)
  }
  const { width, height } = await dimensionsOf(resized)
  const dominantColor = await dominantColorOf(resized)
  return { buffer: resized, width, height, dominantColor, originalDate }
}
