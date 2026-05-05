import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkyCalendar from '~/components/SkyCalendar.vue'
import type { SkyEntry } from '~/utils/manifestSchema'

const skyEntry: SkyEntry = {
  type: 'sky', date: '2026-05-04',
  url: 'https://storage.googleapis.com/skyphotos/2026-05-04.jpg',
  w: 1600, h: 1200, color: '#586878', solstice: false,
  ogSha: 'a'.repeat(64),
}

const solsticeEntry: SkyEntry = {
  type: 'sky', date: '2026-12-21',
  url: 'https://storage.googleapis.com/skyphotos/2026-12-21.jpg',
  w: 1600, h: 1200, color: '#aabbcc', solstice: true,
  ogSha: 'b'.repeat(64),
}

describe('SkyCalendar', () => {
  it('renders one year section per ISO-year-of-entries (descending)', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [skyEntry], today: '2026-05-04' },
    })
    const sections = wrapper.findAll('.sky-year')
    expect(sections.length).toBeGreaterThanOrEqual(1)
    expect(sections[0]?.attributes('data-year')).toBe('2026')
  })

  it('renders the photo cell with backgroundColor matching dominant color', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [skyEntry], today: '2026-05-04' },
    })
    const photoCell = wrapper.find('[data-date="2026-05-04"]')
    expect(photoCell.classes()).toContain('has-photo')
    expect(photoCell.attributes('style')).toContain('#586878')
  })

  it('renders solstice cells with the solstice-halo class', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [solsticeEntry], today: '2026-12-22' },
    })
    const cell = wrapper.find('[data-date="2026-12-21"]')
    expect(cell.classes()).toContain('solstice-halo')
  })

  it('marks the today cell with class today', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [], today: '2026-05-04' },
    })
    const today = wrapper.find('[data-date="2026-05-04"]')
    expect(today.classes()).toContain('today')
  })

  it('emits photo-click with the entry when a photo cell is clicked', async () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [skyEntry], today: '2026-05-04' },
    })
    await wrapper.find('[data-date="2026-05-04"]').trigger('click')
    const events = wrapper.emitted('photo-click') ?? []
    expect(events).toHaveLength(1)
    expect((events[0]?.[0] as SkyEntry).date).toBe('2026-05-04')
  })

  it('renders empty calendar with no entries (still shows the today year)', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [], today: '2026-05-04' },
    })
    expect(wrapper.find('[data-year="2026"]').exists()).toBe(true)
  })
})
