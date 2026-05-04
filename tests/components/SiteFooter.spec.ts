import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteFooter from '~/components/SiteFooter.vue'
import { currentYear } from '~/utils/longNow'

describe('SiteFooter', () => {
  it('renders a back-link to fz.ax', () => {
    const wrapper = mount(SiteFooter)
    const backLink = wrapper.find('a[href="https://fz.ax"]')
    expect(backLink.exists()).toBe(true)
    expect(backLink.text()).toContain('fz.ax')
  })

  it('renders the long-now line for the current year with the leading zero in the long-now-zero class', () => {
    const wrapper = mount(SiteFooter)
    const longNow = wrapper.find('.long-now-line')
    expect(longNow.exists()).toBe(true)
    expect(longNow.text()).toContain('the long now')
    const zero = wrapper.find('.long-now-zero')
    expect(zero.exists()).toBe(true)
    expect(zero.text()).toBe('0')
  })

  it('renders the license line', () => {
    const wrapper = mount(SiteFooter)
    expect(wrapper.text()).toContain('CC0 photos')
    expect(wrapper.text()).toContain('MIT code')
  })

  it('renders the year directly after the leading zero with no separator', () => {
    const wrapper = mount(SiteFooter)
    const longNow = wrapper.find('.long-now-line')
    expect(longNow.text()).toMatch(new RegExp(`0${currentYear()}\\b`))
  })
})
