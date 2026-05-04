<script setup lang="ts">
import { currentYear } from '~/utils/longNow'
import { useManifest } from '~/composables/useManifest'

useHead({
  title: 'ig.fz.ax',
})

const year = currentYear()

const manifest = useManifest()
const skyDays = manifest.entries.filter(e => e.type === 'sky').length
const countFound = manifest.entries.filter(e => e.type === 'count').length

const practices = [
  { name: 'sky', metric: `${skyDays} day${skyDays === 1 ? '' : 's'}`, href: '/sky' },
  { name: 'count', metric: `${countFound} / 217`, href: '/count' },
] as const
</script>

<template>
  <main class="home">
    <section class="home-tiles" :class="`tiles-n-${practices.length}`">
      <PracticeTile
        v-for="p in practices"
        :key="p.name"
        :name="p.name"
        :metric="p.metric"
        :href="p.href"
      />
    </section>
    <p class="home-caption">
      <span class="long-now-zero">0</span>{{ year }} · practices
    </p>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  flex: 1;
  gap: 2rem;
}

.home-tiles {
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

/* Layout-per-N from the spec */
.tiles-n-2 {
  flex-direction: row;
}

@media (max-width: 600px) {
  .tiles-n-2 {
    flex-direction: column;
  }
}

.tiles-n-3 {
  flex-direction: row;
}

.tiles-n-4 {
  flex-wrap: wrap;
  max-width: calc(2 * var(--ig-tile-size-desktop) + 2rem);
}

.home-caption {
  font-size: 0.85rem;
  color: var(--ig-fg-faint);
  letter-spacing: 0.1em;
}
</style>
