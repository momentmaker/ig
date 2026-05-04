<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useManifest } from '~/composables/useManifest'
import type { SkyEntry } from '~/utils/manifestSchema'

const route = useRoute()
const date = computed(() => `${route.params.year}-${route.params.month}-${route.params.day}`)

const manifest = useManifest()
const entry = computed<SkyEntry | undefined>(() =>
  manifest.entries.find(
    (e): e is SkyEntry => e.type === 'sky' && e.date === date.value,
  ),
)

useHead(() => {
  if (entry.value === undefined) return { title: 'sky · ig.fz.ax' }
  return {
    title: `sky on ${entry.value.date} · ig.fz.ax`,
    meta: [
      { property: 'og:title', content: `sky on ${entry.value.date}` },
      { property: 'og:description', content: 'noticing what was previously invisible' },
      { property: 'og:image', content: entry.value.url },
      { property: 'og:type', content: 'article' },
    ],
  }
})

const sortedSkies = computed(() =>
  manifest.entries
    .filter((e): e is SkyEntry => e.type === 'sky')
    .sort((a, b) => a.date.localeCompare(b.date)),
)
const idx = computed(() =>
  sortedSkies.value.findIndex(e => e.date === date.value),
)
const prevHref = computed(() => {
  if (idx.value <= 0) return null
  const prev = sortedSkies.value[idx.value - 1]
  if (prev === undefined) return null
  const [y, m, d] = prev.date.split('-')
  return `/sky/${y}/${m}/${d}`
})
const nextHref = computed(() => {
  if (idx.value < 0 || idx.value >= sortedSkies.value.length - 1) return null
  const next = sortedSkies.value[idx.value + 1]
  if (next === undefined) return null
  const [y, m, d] = next.date.split('-')
  return `/sky/${y}/${m}/${d}`
})
</script>

<template>
  <main class="sky-permalink">
    <p v-if="entry === undefined" class="not-found">no sky photo for {{ date }}</p>
    <article v-else class="permalink-content">
      <figure>
        <img :src="entry.url" :alt="`sky on ${entry.date}`" class="permalink-photo">
        <figcaption class="permalink-caption">{{ entry.date }}</figcaption>
      </figure>
      <nav class="permalink-nav">
        <a v-if="prevHref" :href="prevHref" class="nav-link">← previous</a>
        <a href="/sky" class="nav-link">all sky</a>
        <a v-if="nextHref" :href="nextHref" class="nav-link">next →</a>
      </nav>
    </article>
  </main>
</template>

<style scoped>
.sky-permalink { padding: 2rem 1rem; max-width: 1400px; margin: 0 auto; }
.permalink-content { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.permalink-photo { max-width: 100%; max-height: 80vh; object-fit: contain; }
.permalink-caption {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
}
.permalink-nav { display: flex; gap: 1.5rem; align-items: center; }
.nav-link {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
}
.nav-link:hover { color: var(--ig-blue); }
.not-found { color: var(--ig-fg-faint); text-align: center; padding: 4rem 0; }
</style>
