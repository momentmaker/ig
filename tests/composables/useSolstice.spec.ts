import { describe, test, expect, vi } from 'vitest'

describe('useSolstice', () => {
  test('returns active window when buildDate is a mile-marker', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { buildDate: '2026-06-21' },
    }))
    const { useSolstice } = await import('~/composables/useSolstice')
    const result = useSolstice()
    expect(result.active).toBe(true)
    expect(result.kind).toBe('summer')
    expect(result.anchor).toBe('2026-06-21')
    vi.unstubAllGlobals()
  })

  test('returns inactive when buildDate is not in window', async () => {
    vi.resetModules()
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { buildDate: '2026-05-04' },
    }))
    const { useSolstice } = await import('~/composables/useSolstice')
    const result = useSolstice()
    expect(result.active).toBe(false)
    expect(result.kind).toBeNull()
    expect(result.anchor).toBeNull()
    vi.unstubAllGlobals()
  })
})
