import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SolsticeBanner from '~/components/SolsticeBanner.vue'

describe('SolsticeBanner', () => {
  test('renders summer solstice with anchor date', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'summer', anchor: '2026-06-21' } })
    expect(w.text()).toContain('summer solstice')
    expect(w.text()).toContain('2026-06-21')
  })

  test('renders vernal equinox', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'vernal', anchor: '2026-03-20' } })
    expect(w.text()).toContain('vernal equinox')
  })

  test('renders autumnal equinox', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'autumnal', anchor: '2026-09-23' } })
    expect(w.text()).toContain('autumnal equinox')
  })

  test('renders winter solstice', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'winter', anchor: '2026-12-21' } })
    expect(w.text()).toContain('winter solstice')
  })

  test('aside has role=note for assistive tech', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'summer', anchor: '2026-06-21' } })
    expect(w.find('aside').attributes('role')).toBe('note')
  })
})
