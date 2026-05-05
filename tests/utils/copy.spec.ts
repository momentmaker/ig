import { describe, test, expect } from 'vitest'
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'

describe('copy', () => {
  test('OG_FALLBACK_DESCRIPTION exposes the canonical site description', () => {
    expect(OG_FALLBACK_DESCRIPTION).toBe('noticing what was previously invisible')
  })
})
