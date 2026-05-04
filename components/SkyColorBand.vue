<script setup lang="ts">
import { computed } from 'vue'
import { skyEntriesByYear, gridForYear, type SkyCell } from '~/utils/sky-grid'
import { isoWeekYear } from '~/utils/iso-week'
import type { SkyEntry } from '~/utils/manifestSchema'

interface Props {
  entries: SkyEntry[]
  today: string
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'photo-click': [entry: SkyEntry]
}>()

const years = computed(() => {
  const set = new Set<number>(skyEntriesByYear(props.entries).keys())
  set.add(isoWeekYear(new Date(`${props.today}T00:00:00Z`)))
  return Array.from(set).sort((a, b) => b - a)
})

const bands = computed(() => years.value.map(year => ({
  year,
  cells: gridForYear(year, props.entries, props.today).flat().filter((c): c is SkyCell => c !== null),
})))

function stripeStyle(cell: SkyCell): string {
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    return `background-color: ${cell.entry.color}`
  }
  return ''
}

function onStripeClick(cell: SkyCell): void {
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    emit('photo-click', cell.entry)
  }
}
</script>

<template>
  <div class="color-band">
    <section
      v-for="band in bands"
      :key="band.year"
      class="year-band"
      :data-year="band.year"
    >
      <h2 class="year-label">{{ band.year }}</h2>
      <div class="stripes">
        <button
          v-for="cell in band.cells"
          :key="cell.date"
          type="button"
          class="stripe"
          :class="cell.kind"
          :style="stripeStyle(cell)"
          :data-date="cell.date"
          :disabled="cell.kind !== 'has-photo' && cell.kind !== 'today-with-photo'"
          :title="cell.date"
          @click="onStripeClick(cell)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.color-band { display: flex; flex-direction: column; gap: 2rem; }
.year-band { display: flex; flex-direction: column; gap: 0.5rem; }
.year-label {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg-faint);
  margin: 0;
}
.stripes { display: flex; height: 80px; gap: 0; }
.stripe {
  flex: 1;
  border: none;
  padding: 0;
  background: transparent;
  cursor: default;
  min-width: 0;
}
.stripe.has-photo, .stripe.today-with-photo { cursor: pointer; }
.stripe.gap { background: transparent; }
</style>
