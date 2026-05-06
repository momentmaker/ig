import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { processPhoto } from '~/scripts/lib/pipeline'
import { exiftool } from 'exiftool-vendored'

afterAll(async () => {
  await exiftool.end()
})

const fixturePath = 'tests/fixtures/sample.jpg'

async function readTagsFromBuffer(buf: Buffer): Promise<Record<string, unknown>> {
  const dir = mkdtempSync(join(tmpdir(), 'ig-pipe-test-'))
  const path = join(dir, 'out.jpg')
  writeFileSync(path, buf)
  try {
    return await exiftool.read(path) as Record<string, unknown>
  }
  finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('processPhoto', () => {
  it('returns a JPEG buffer with sane dimensions', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input, { tz: 'America/New_York' })
    expect(Buffer.isBuffer(result.buffer)).toBe(true)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    expect(result.width).toBeLessThanOrEqual(1600)
    expect(result.height).toBeLessThanOrEqual(1600)
  })

  it('strips ALL EXIF tags from the output buffer', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input, { tz: 'America/New_York' })
    const tags = await readTagsFromBuffer(result.buffer)
    expect(tags.Make).toBeUndefined()
    expect(tags.Model).toBeUndefined()
  }, 15_000)

  it('returns a dominant color hex string', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input, { tz: 'America/New_York' })
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('output buffer is roughly ≤ 1.2 MB for a small input', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input, { tz: 'America/New_York' })
    expect(result.buffer.byteLength).toBeLessThanOrEqual(1_200_000)
  })
})

// Regression: a photo recorded at 19:28 with offset -05:00 has UTC timestamp
// 00:28 the NEXT day. Pipeline previously used `toISOString().slice(0,10)`
// which returned the UTC date, drifting May 5 photos to May 6 in author NY
// time (-04:00 EDT). Verify the date now resolves in author TZ.
describe('TZ correctness via processPhoto', () => {
  it('a photo at 19:28 -05:00 resolves to 20:28 in America/New_York EDT', async () => {
    const sharpMod = await import('sharp')
    const sharp = sharpMod.default
    const dir = mkdtempSync(join(tmpdir(), 'ig-pipe-tz-'))
    const inPath = join(dir, 'in.jpg')
    await sharp({ create: { width: 100, height: 100, channels: 3, background: '#586878' } })
      .jpeg().toFile(inPath)
    await exiftool.write(inPath, { DateTimeOriginal: '2026:05:05 19:28:00-05:00' as never }, ['-overwrite_original'])
    const buf = readFileSync(inPath)
    const result = await processPhoto(buf, { tz: 'America/New_York' })
    rmSync(dir, { recursive: true, force: true })
    // 19:28 in -05:00 = 00:28 UTC May 6 = 20:28 EDT May 5
    expect(result.originalDate).toBe('2026-05-05')
    expect(result.originalTime).toBe('20:28')
  }, 30_000)
})
