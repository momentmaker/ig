import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkyColorBand from '~/components/SkyColorBand.vue'
import type { SkyEntry } from '~/utils/manifestSchema'

const sky: SkyEntry = {
  type: 'sky', date: '2026-05-04',
  url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
  w: 1600, h: 1200, color: '#586878', solstice: false,
  ogSha: 'a'.repeat(64),
}

describe('SkyColorBand', () => {
  it('renders a band per ISO-year (descending)', () => {
    const wrapper = mount(SkyColorBand, {
      props: { entries: [sky], today: '2026-05-04' },
    })
    const bands = wrapper.findAll('.year-band')
    expect(bands.length).toBeGreaterThanOrEqual(1)
    expect(bands[0]?.attributes('data-year')).toBe('2026')
  })

  it('renders one stripe per day, colored when there is an entry', () => {
    const wrapper = mount(SkyColorBand, {
      props: { entries: [sky], today: '2026-05-04' },
    })
    const stripe = wrapper.find('[data-date="2026-05-04"]')
    expect(stripe.attributes('style')).toContain('#586878')
  })

  it('clicking a colored stripe emits photo-click', async () => {
    const wrapper = mount(SkyColorBand, {
      props: { entries: [sky], today: '2026-05-04' },
    })
    await wrapper.find('[data-date="2026-05-04"]').trigger('click')
    expect(wrapper.emitted('photo-click')).toHaveLength(1)
  })
})
