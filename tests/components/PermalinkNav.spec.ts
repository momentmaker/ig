import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PermalinkNav from '~/components/PermalinkNav.vue'

describe('PermalinkNav', () => {
  test('renders all label and link unconditionally', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/sky', allLabel: 'sky' },
    })
    const links = w.findAll('a')
    expect(links.length).toBe(1)
    expect(links[0]!.attributes('href')).toBe('/sky')
    expect(links[0]!.text()).toContain('all sky')
  })

  test('renders prev when prevHref is set', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/sky', allLabel: 'sky', prevHref: '/sky/2026/05/03' },
    })
    const prev = w.find('a[href="/sky/2026/05/03"]')
    expect(prev.exists()).toBe(true)
    expect(prev.text()).toContain('previous')
  })

  test('renders next when nextHref is set', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/sky', allLabel: 'sky', nextHref: '/sky/2026/05/05' },
    })
    const next = w.find('a[href="/sky/2026/05/05"]')
    expect(next.exists()).toBe(true)
    expect(next.text()).toContain('next')
  })

  test('omits prev/next when not provided', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/count', allLabel: 'count' },
    })
    expect(w.findAll('a').length).toBe(1)
  })
})
