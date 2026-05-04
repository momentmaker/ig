import { describe, it, expect } from 'vitest'
import { useManifest } from '~/composables/useManifest'

describe('useManifest', () => {
  it('exposes the manifest with version, license, and entries', () => {
    const m = useManifest()
    expect(m.version).toBe(1)
    expect(m.license).toBe('CC0-1.0')
    expect(Array.isArray(m.entries)).toBe(true)
  })

  it('exposes typed sky/count helpers', () => {
    const m = useManifest()
    const skies = m.entries.filter(e => e.type === 'sky')
    const counts = m.entries.filter(e => e.type === 'count')
    expect(skies.every(e => e.type === 'sky')).toBe(true)
    expect(counts.every(e => e.type === 'count')).toBe(true)
  })
})
