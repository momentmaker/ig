<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ogImageForRoot, useManifest } from '~/composables/useManifest'
import { AUTHOR_TZ } from '~/utils/longNow'
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'
import type { SkyEntry } from '~/utils/manifestSchema'

const manifest = useManifest()
const ogImage = ogImageForRoot(manifest.entries, 'sky')

useHead({
  title: 'sky · ig.fz.ax',
  meta: [
    { property: 'og:title', content: 'sky · ig.fz.ax' },
    { property: 'og:description', content: OG_FALLBACK_DESCRIPTION },
    { property: 'og:image', content: ogImage },
    { property: 'og:type', content: 'website' },
  ],
})
const skyEntries = computed(() =>
  manifest.entries.filter((e): e is SkyEntry => e.type === 'sky'),
)

function todayInAuthorTz(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AUTHOR_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}
const today = ref(todayInAuthorTz())

const view = ref<'calendar' | 'colorband' | 'weeks'>('calendar')

const sortedSkies = computed(() =>
  [...skyEntries.value].sort((a, b) => a.date.localeCompare(b.date)),
)

const openIndex = ref<number | null>(null)
const openEntry = computed<SkyEntry | null>(() => {
  if (openIndex.value === null) return null
  return sortedSkies.value[openIndex.value] ?? null
})

const lightboxData = computed(() => {
  const e = openEntry.value
  if (e === null) return null
  return {
    url: e.url,
    alt: `sky on ${e.date}`,
    caption: e.date,
  }
})

const hasPrev = computed(() => openIndex.value !== null && openIndex.value > 0)
const hasNext = computed(() =>
  openIndex.value !== null && openIndex.value < sortedSkies.value.length - 1,
)

function permalinkFor(entry: SkyEntry): string {
  const [y, m, d] = entry.date.split('-')
  return `/sky/${y}/${m}/${d}`
}

function openPhoto(entry: SkyEntry): void {
  const idx = sortedSkies.value.findIndex(e => e.date === entry.date)
  if (idx < 0) return
  openIndex.value = idx
  if (typeof history !== 'undefined') {
    history.pushState({ ig: true }, '', permalinkFor(entry))
  }
}

function step(delta: number): void {
  if (openIndex.value === null) return
  const next = openIndex.value + delta
  if (next < 0 || next >= sortedSkies.value.length) return
  openIndex.value = next
  const e = sortedSkies.value[next]
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
  <main class="sky-page">
    <header class="sky-header">
      <h1><a href="/" class="sky-home-link">sky</a></h1>
      <div class="view-toggle">
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: view === 'calendar' }"
          @click="view = 'calendar'"
        >
          calendar
        </button>
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: view === 'colorband' }"
          @click="view = 'colorband'"
        >
          color band
        </button>
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: view === 'weeks' }"
          @click="view = 'weeks'"
        >
          weeks
        </button>
      </div>
    </header>

    <SkyCalendar
      v-if="view === 'calendar'"
      :entries="skyEntries"
      :today="today"
      @photo-click="openPhoto"
    />
    <SkyColorBand
      v-else-if="view === 'colorband'"
      :entries="skyEntries"
      :today="today"
      @photo-click="openPhoto"
    />
    <SkyWeeksList
      v-else
      :entries="skyEntries"
      :today="today"
      @photo-click="openPhoto"
    />

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
.sky-page { padding: 2rem 1rem; max-width: 1400px; margin: 0 auto; }
.sky-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 2.5rem;
}
.sky-header h1 {
  font-size: 1.5rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  margin: 0;
  font-weight: normal;
}
.sky-home-link {
  color: inherit;
  text-decoration: none;
}
.sky-home-link:hover { color: var(--ig-yellow); }
.view-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--ig-fg-faint);
  border-color: rgba(127, 127, 127, 0.4);
}
.toggle-btn {
  background: transparent;
  border: none;
  border-left: 1px solid rgba(127, 127, 127, 0.4);
  color: var(--ig-fg-faint);
  padding: 0.45rem 1rem;
  font-size: 0.75rem;
  font-variant: small-caps;
  letter-spacing: 0.12em;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s ease, background-color 0.2s ease;
}
.toggle-btn:first-child { border-left: none; }
.toggle-btn:hover { color: var(--ig-fg); }
.toggle-btn:focus { outline: none; }
.toggle-btn:focus-visible {
  outline: 1px solid var(--ig-yellow);
  outline-offset: 2px;
}
.toggle-btn.active {
  background: var(--ig-fg);
  color: var(--ig-bg);
}
@media (max-width: 600px) {
  .sky-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
  .view-toggle { width: 100%; }
  .toggle-btn { flex: 1; }
}
</style>
