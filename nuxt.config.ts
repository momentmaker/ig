import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

interface SkyEntryShape { type: 'sky', date: string }
interface CountEntryShape { type: 'count', n: number }
interface ManifestShape { entries: (SkyEntryShape | CountEntryShape)[] }

function manifestRoutes(): string[] {
  const path = fileURLToPath(new URL('./data/manifest.json', import.meta.url))
  const raw = readFileSync(path, 'utf8')
  const parsed = JSON.parse(raw) as ManifestShape
  const out: string[] = []
  for (const entry of parsed.entries) {
    if (entry.type === 'sky') {
      const [y, m, d] = entry.date.split('-')
      out.push(`/sky/${y}/${m}/${d}`)
    }
    else if (entry.type === 'count') {
      out.push(`/count/${entry.n}`)
    }
  }
  return out
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/', '/sky', '/count', ...manifestRoutes()],
      crawlLinks: false,
      failOnError: true
    }
  },
  app: {
    baseURL: '/',
    cdnURL: '',
    head: {
      htmlAttrs: { lang: 'en' },
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
  runtimeConfig: {
    public: {
      buildDate: process.env.BUILD_DATE ?? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    },
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2026-05-03',
  devtools: { enabled: true }
})
