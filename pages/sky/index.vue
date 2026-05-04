<script setup lang="ts">
import { ref, computed } from 'vue'
import { useManifest } from '~/composables/useManifest'
import { AUTHOR_TZ } from '~/utils/longNow'
import type { SkyEntry } from '~/utils/manifestSchema'

useHead({
  title: 'sky · ig.fz.ax',
})

const manifest = useManifest()
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

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    openIndex.value = null
  })
}
</script>

<template>
  <main class="sky-page">
    <header class="sky-header">
      <h1>sky</h1>
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
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 2rem;
}
.sky-header h1 {
  font-size: 1.5rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  margin: 0;
  font-weight: normal;
}
.view-toggle { display: flex; gap: 0.5rem; }
.toggle-btn {
  background: transparent;
  border: 1px solid var(--ig-fg-faint);
  color: var(--ig-fg-faint);
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  cursor: pointer;
  font-family: inherit;
}
.toggle-btn.active {
  border-color: var(--ig-fg);
  color: var(--ig-fg);
}
</style>
