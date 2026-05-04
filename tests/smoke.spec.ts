import { describe, it, expect } from 'vitest'

describe('vitest smoke', () => {
  it('runs in happy-dom and has document', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement).toBeTypeOf('function')
  })
})
