import { describe, it, expect } from 'vitest'
import { urlFor, JSDELIVR_BASE, relPathFromUrl } from '~/scripts/lib/photo-store'

describe('urlFor', () => {
  it('returns the jsDelivr URL for a relative path', () => {
    expect(urlFor('sky/2026-05-04.jpg')).toBe(`${JSDELIVR_BASE}/sky/2026-05-04.jpg`)
  })
})

describe('JSDELIVR_BASE', () => {
  it('points at the momentmaker/ig repo with @latest tag and /photos subdir', () => {
    expect(JSDELIVR_BASE).toBe('https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos')
  })
})

describe('relPathFromUrl', () => {
  it('extracts the relative path from a jsDelivr URL', () => {
    expect(relPathFromUrl(`${JSDELIVR_BASE}/sky/2026-05-04.jpg`)).toBe('sky/2026-05-04.jpg')
    expect(relPathFromUrl(`${JSDELIVR_BASE}/count/087-2026-05-03.jpg`)).toBe('count/087-2026-05-03.jpg')
  })

  it('returns null for non-jsDelivr URLs', () => {
    expect(relPathFromUrl('https://storage.googleapis.com/skyphotos/x.jpg')).toBeNull()
    expect(relPathFromUrl('https://example.com/foo.jpg')).toBeNull()
  })
})
