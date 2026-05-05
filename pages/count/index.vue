<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ogImageForRoot, useManifest } from '~/composables/useManifest'
import { MAX_N } from '~/utils/spiral'
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'
import type { CountEntry } from '~/utils/manifestSchema'

const manifest = useManifest()
const ogImage = ogImageForRoot(manifest.entries, 'count')

useHead({
  title: 'count · ig.fz.ax',
  meta: [
    { property: 'og:title', content: 'count · ig.fz.ax' },
    { property: 'og:description', content: OG_FALLBACK_DESCRIPTION },
    { property: 'og:image', content: ogImage },
    { property: 'og:type', content: 'website' },
  ],
})
const countEntries = computed(() =>
  manifest.entries.filter((e): e is CountEntry => e.type === 'count'),
)

const sortedCounts = computed(() =>
  [...countEntries.value].sort((a, b) => a.n - b.n),
)

const found = computed(() => sortedCounts.value.length)
const total = MAX_N + 1

const openIndex = ref<number | null>(null)
const openEntry = computed<CountEntry | null>(() => {
  if (openIndex.value === null) return null
  return sortedCounts.value[openIndex.value] ?? null
})

const lightboxData = computed(() => {
  const e = openEntry.value
  if (e === null) return null
  return {
    url: e.url,
    alt: `the number ${e.n}, found ${e.date}`,
    caption: String(e.n),
    ...(e.whisper !== undefined ? { whisper: e.whisper } : {}),
  }
})

const hasPrev = computed(() => openIndex.value !== null && openIndex.value > 0)
const hasNext = computed(() =>
  openIndex.value !== null && openIndex.value < sortedCounts.value.length - 1,
)

function permalinkFor(entry: CountEntry): string {
  return `/count/${entry.n}`
}

function openPhoto(entry: CountEntry): void {
  const idx = sortedCounts.value.findIndex(e => e.n === entry.n)
  if (idx < 0) return
  openIndex.value = idx
  if (typeof history !== 'undefined') {
    history.pushState({ ig: true }, '', permalinkFor(entry))
  }
}

function step(delta: number): void {
  if (openIndex.value === null) return
  const next = openIndex.value + delta
  if (next < 0 || next >= sortedCounts.value.length) return
  openIndex.value = next
  const e = sortedCounts.value[next]
  if (e !== undefined && typeof history !== 'undefined') {
    history.replaceState({ ig: true }, '', permalinkFor(e))
  }
}

function close(): void {
  if (openIndex.value === null) return
  openIndex.value = null
  if (typeof history !== 'undefined' && history.state?.ig === true) {
    history.back()
  }
}

function onPopState(): void {
  openIndex.value = null
}
onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('popstate', onPopState)
})
onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('popstate', onPopState)
})
</script>

<template>
  <main class="count-page">
    <header class="count-header">
      <h1><a href="/" class="count-home-link">count</a></h1>
      <div class="progress">{{ found }} / {{ total }} found</div>
    </header>

    <CountField :entries="countEntries" @photo-click="openPhoto" />

    <PhotoLightbox
      :entry="lightboxData"
      :has-prev="hasPrev"
      :has-next="hasNext"
      @close="close"
      @prev="step(-1)"
      @next="step(1)"
    />
  </main>
</template>

<style scoped>
.count-page { padding: 2rem 1rem; max-width: 1400px; margin: 0 auto; }
.count-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}
.count-header h1 {
  font-size: 1.5rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  margin: 0;
  font-weight: normal;
}
.count-home-link {
  color: inherit;
  text-decoration: none;
}
.count-home-link:hover { color: var(--ig-yellow); }
.progress {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.12em;
  color: var(--ig-fg-faint);
}
</style>
