import { describe, it, expect, vi } from 'vitest'
import { uploadObject, type MinimalStorage } from '~/scripts/lib/gcs'

describe('uploadObject', () => {
  it('writes the object to the named bucket with immutable cache-control', async () => {
    const save = vi.fn().mockResolvedValue([])
    const file = vi.fn().mockReturnValue({ save })
    const bucket = vi.fn().mockReturnValue({ file })
    const fakeStorage: MinimalStorage = { bucket }
    const buf = Buffer.from('hello')
    const url = await uploadObject('sky-photos', 'sky/2026-05-03.jpg', buf, fakeStorage)
    expect(bucket).toHaveBeenCalledWith('sky-photos')
    expect(file).toHaveBeenCalledWith('sky/2026-05-03.jpg')
    expect(save).toHaveBeenCalledWith(buf, expect.objectContaining({
      contentType: 'image/jpeg',
      metadata: expect.objectContaining({
        cacheControl: 'public, max-age=31536000, immutable',
      }),
    }))
    expect(url).toBe('https://storage.googleapis.com/sky-photos/sky/2026-05-03.jpg')
  })

  it('rejects when the bucket name is empty', async () => {
    await expect(uploadObject('', 'foo.jpg', Buffer.from('x'))).rejects.toThrow(/bucket/i)
  })

  it('rejects when the object name is empty', async () => {
    await expect(uploadObject('sky-photos', '', Buffer.from('x'))).rejects.toThrow(/object/i)
  })
})
