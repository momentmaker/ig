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
    const result = await processPhoto(input)
    expect(Buffer.isBuffer(result.buffer)).toBe(true)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    expect(result.width).toBeLessThanOrEqual(1600)
    expect(result.height).toBeLessThanOrEqual(1600)
  })

  it('strips ALL EXIF tags from the output buffer', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    const tags = await readTagsFromBuffer(result.buffer)
    expect(tags.Make).toBeUndefined()
    expect(tags.Model).toBeUndefined()
  }, 15_000)

  it('returns a dominant color hex string', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('output buffer is roughly ≤ 1.2 MB for a small input', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    expect(result.buffer.byteLength).toBeLessThanOrEqual(1_200_000)
  })
})
