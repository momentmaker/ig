import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CountField from '~/components/CountField.vue'
import type { CountEntry } from '~/utils/manifestSchema'

const count87: CountEntry = {
  type: 'count', n: 87, date: '2026-05-03',
  url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/087-2026-05-03.jpg',
  w: 1600, h: 1200,
  whisper: 'parking sign in astoria',
}

describe('CountField', () => {
  it('renders 217 cells', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    expect(wrapper.findAll('[data-n]').length).toBe(217)
  })

  it('marks the center cell n=0', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    const center = wrapper.find('[data-n="0"]')
    expect(center.exists()).toBe(true)
  })

  it('marks unfound cells with class unfound', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    const cell = wrapper.find('[data-n="42"]')
    expect(cell.classes()).toContain('unfound')
  })

  it('marks found cells with class found and sets the photo url as a CSS background', () => {
    const wrapper = mount(CountField, { props: { entries: [count87] } })
    const cell = wrapper.find('[data-n="87"]')
    expect(cell.classes()).toContain('found')
    expect(cell.attributes('style') ?? '').toContain(count87.url)
  })

  it('emits photo-click with the entry when a found cell is clicked', async () => {
    const wrapper = mount(CountField, { props: { entries: [count87] } })
    await wrapper.find('[data-n="87"]').trigger('click')
    const events = wrapper.emitted('photo-click') ?? []
    expect(events).toHaveLength(1)
    expect((events[0]?.[0] as CountEntry).n).toBe(87)
  })

  it('does not emit photo-click for unfound cells', async () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    await wrapper.find('[data-n="42"]').trigger('click')
    expect(wrapper.emitted('photo-click')).toBeUndefined()
  })

  it('renders the number label inside each cell', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    const cell0 = wrapper.find('[data-n="0"]')
    const cell216 = wrapper.find('[data-n="216"]')
    expect(cell0.text()).toContain('0')
    expect(cell216.text()).toContain('216')
  })
})
