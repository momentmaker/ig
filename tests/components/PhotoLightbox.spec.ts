import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PhotoLightbox from '~/components/PhotoLightbox.vue'

describe('PhotoLightbox', () => {
  it('renders nothing when entry is null', () => {
    const wrapper = mount(PhotoLightbox, { props: { entry: null } })
    expect(wrapper.find('.lightbox').exists()).toBe(false)
  })

  it('renders the photo when entry is provided', () => {
    const wrapper = mount(PhotoLightbox, {
      props: {
        entry: {
          url: 'https://example.com/x.jpg',
          alt: 'sky on 2026-05-04',
          caption: '2026-05-04',
        },
      },
    })
    expect(wrapper.find('.lightbox').exists()).toBe(true)
    expect(wrapper.find('img.lightbox-photo').attributes('src')).toBe('https://example.com/x.jpg')
    expect(wrapper.find('img.lightbox-photo').attributes('alt')).toBe('sky on 2026-05-04')
    expect(wrapper.find('.lightbox-caption').text()).toBe('2026-05-04')
  })

  it('emits close on backdrop click', async () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' } },
    })
    await wrapper.find('.lightbox-backdrop').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on ESC key', async () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' } },
      attachTo: document.body,
    })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('emits prev/next on chevron click when handlers are wired', async () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' }, hasPrev: true, hasNext: true },
    })
    await wrapper.find('.chevron-prev').trigger('click')
    await wrapper.find('.chevron-next').trigger('click')
    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('hides chevrons when hasPrev/hasNext is false', () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' }, hasPrev: false, hasNext: false },
    })
    expect(wrapper.find('.chevron-prev').exists()).toBe(false)
    expect(wrapper.find('.chevron-next').exists()).toBe(false)
  })
})
