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
.color-band { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
.year-band { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
.year-label {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg-faint);
  margin: 0;
}
.stripes {
  display: flex;
  height: 100px;
  gap: 0;
  width: 100%;
  border: 1px solid rgba(127, 127, 127, 0.25);
}
.stripe {
  flex: 1;
  border: none;
  padding: 0;
  background: rgba(127, 127, 127, 0.35);
  cursor: default;
  min-width: 0;
}
.stripe.has-photo, .stripe.today-with-photo {
  cursor: pointer;
  /* photo cells get inline background-color from dominant color; widen them
     a bit so they read against the thin gap-day strips */
  flex: 3;
  outline: 1px solid rgba(0, 0, 0, 0.2);
  outline-offset: -1px;
}
.stripe.gap { background: rgba(127, 127, 127, 0.35); }
.stripe.future { background: rgba(127, 127, 127, 0.1); }
.stripe.today-empty {
  background: var(--ig-yellow);
  opacity: 0.55;
  flex: 2;
}
</style>
