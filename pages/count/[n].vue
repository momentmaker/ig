<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useManifest } from '~/composables/useManifest'
import type { CountEntry } from '~/utils/manifestSchema'
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'

const route = useRoute()
const n = computed(() => Number(route.params.n))

const manifest = useManifest()
const entry = computed<CountEntry | undefined>(() =>
  manifest.entries.find(
    (e): e is CountEntry => e.type === 'count' && e.n === n.value,
  ),
)

useHead(() => {
  if (entry.value === undefined) return { title: 'count · ig.fz.ax' }
  return {
    title: `the number ${entry.value.n} · ig.fz.ax`,
    meta: [
      { property: 'og:title', content: `the number ${entry.value.n}` },
      { property: 'og:description', content: entry.value.whisper ?? OG_FALLBACK_DESCRIPTION },
      { property: 'og:image', content: entry.value.url },
      { property: 'og:type', content: 'article' },
    ],
  }
})

const sortedCounts = computed(() =>
  manifest.entries
    .filter((e): e is CountEntry => e.type === 'count')
    .sort((a, b) => a.n - b.n),
)
const idx = computed(() =>
  sortedCounts.value.findIndex(e => e.n === n.value),
)
const prevHref = computed(() => {
  if (idx.value <= 0) return null
  const prev = sortedCounts.value[idx.value - 1]
  if (prev === undefined) return null
  return `/count/${prev.n}`
})
const nextHref = computed(() => {
  if (idx.value < 0 || idx.value >= sortedCounts.value.length - 1) return null
  const next = sortedCounts.value[idx.value + 1]
  if (next === undefined) return null
  return `/count/${next.n}`
})
</script>

<template>
  <main class="count-permalink">
    <p v-if="entry === undefined" class="not-found">no count entry for {{ n }}</p>
    <article v-else class="permalink-content">
      <h1 class="big-number">{{ entry.n }}</h1>
      <figure>
        <div class="permalink-photo-outer">
          <div class="permalink-photo-frame">
            <img :src="entry.url" :alt="`the number ${entry.n}, found ${entry.date}`" class="permalink-photo">
          </div>
        </div>
        <figcaption class="permalink-caption">found {{ entry.date }}</figcaption>
        <p v-if="entry.whisper" class="permalink-whisper">{{ entry.whisper }}</p>
      </figure>
      <PermalinkNav
        :prev-href="prevHref"
        all-href="/count"
        all-label="count"
        :next-href="nextHref"
      />
    </article>
  </main>
</template>

<style scoped>
.count-permalink { padding: 2rem 1rem; max-width: 1400px; margin: 0 auto; }
.permalink-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}
.big-number {
  font-size: 4rem;
  margin: 0;
  font-weight: normal;
  font-variant: tabular-nums;
  letter-spacing: 0.05em;
}
.permalink-photo-outer {
  width: min(70vh, 70vw);
  aspect-ratio: 1;
  background: var(--ig-yellow);
  clip-path: var(--hex-clip-square);
  display: flex;
  align-items: center;
  justify-content: center;
}
.permalink-photo-frame {
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  clip-path: var(--hex-clip-square);
  overflow: hidden;
}
.permalink-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.permalink-caption {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
}
.permalink-whisper {
  font-style: italic;
  color: var(--ig-fg);
  text-align: center;
  max-width: 60ch;
  margin: 0;
}
.not-found { color: var(--ig-fg-faint); text-align: center; padding: 4rem 0; }
</style>
