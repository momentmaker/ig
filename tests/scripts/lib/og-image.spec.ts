import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { composeOgImage } from '~/scripts/lib/og-image'

const TMP = mkdtempSync(join(tmpdir(), 'og-image-test-'))

beforeAll(async () => {
  await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 50, b: 80 } },
  }).jpeg().toFile(join(TMP, 'photo.jpg'))
})

afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('composeOgImage', () => {
  test('writes a 1200x630 png to outPath', async () => {
    const outPath = join(TMP, 'out-default.png')
    await composeOgImage({ photoPath: join(TMP, 'photo.jpg'), caption: 'sky 2026-05-04', outPath })
    const meta = await sharp(outPath).metadata()
    expect(meta.width).toBe(1200)
    expect(meta.height).toBe(630)
    expect(meta.format).toBe('png')
    expect(statSync(outPath).size).toBeGreaterThan(1000)
  })

  test('accepts solstice variant (gold ring)', async () => {
    const outPath = join(TMP, 'out-solstice.png')
    await composeOgImage({ photoPath: join(TMP, 'photo.jpg'), caption: 'sky 2026-06-21', outPath, solstice: true })
    expect(statSync(outPath).size).toBeGreaterThan(1000)
  })
})
