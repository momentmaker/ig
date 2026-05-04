// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/'],
      crawlLinks: false,
      failOnError: true
    }
  },
  app: {
    baseURL: '/',
    cdnURL: '',
    head: {
      title: 'ig.fz.ax',
      meta: [
        { name: 'description', content: 'noticing what was previously invisible' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0d0d0d', media: '(prefers-color-scheme: dark)' },
        { name: 'theme-color', content: '#F7B808', media: '(prefers-color-scheme: light)' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2026-05-03',
  devtools: { enabled: true }
})
