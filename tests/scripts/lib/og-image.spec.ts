import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { composeOgImage, composeHomeOgImage } from '~/scripts/lib/og-image'

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

describe('composeHomeOgImage', () => {
  test('writes a 1200x630 png with both sky and count panels', async () => {
    // #given two distinct source photos
    await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 60, b: 100 } },
    }).jpeg().toFile(join(TMP, 'sky.jpg'))
    await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 180, b: 100 } },
    }).jpeg().toFile(join(TMP, 'count.jpg'))

    const outPath = join(TMP, 'home.png')

    // #when composing the home og image
    await composeHomeOgImage({
      sky: { photoPath: join(TMP, 'sky.jpg'), label: 'sky', description: 'daily sky photo' },
      count: { photoPath: join(TMP, 'count.jpg'), label: 'count', description: 'numbers 0–216 in the wild' },
      outPath,
    })

    // #then the output is a valid 1200x630 png
    const meta = await sharp(outPath).metadata()
    expect(meta.width).toBe(1200)
    expect(meta.height).toBe(630)
    expect(meta.format).toBe('png')
    expect(statSync(outPath).size).toBeGreaterThan(1000)
  })
})
