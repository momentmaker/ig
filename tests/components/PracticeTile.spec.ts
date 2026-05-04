import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PracticeTile from '~/components/PracticeTile.vue'

describe('PracticeTile', () => {
  it('renders the practice name in small caps', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    const nameEl = wrapper.find('.tile-name')
    expect(nameEl.exists()).toBe(true)
    expect(nameEl.text()).toBe('sky')
    expect(nameEl.classes()).toContain('small-caps')
  })

  it('renders the metric', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'count', metric: '0 / 217', href: '/count' }
    })
    expect(wrapper.find('.tile-metric').text()).toBe('0 / 217')
  })

  it('wraps the tile in an anchor pointing at href', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    const link = wrapper.find('a.practice-tile')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/sky')
  })

  it('applies the hex-clip class for the hexagonal shape', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    expect(wrapper.find('.tile-clip').classes()).toContain('hex-clip')
  })

  it('renders without a backdrop image when none provided', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    expect(wrapper.find('.tile-backdrop').exists()).toBe(false)
  })
})
