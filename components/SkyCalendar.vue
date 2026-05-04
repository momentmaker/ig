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

const yearsToRender = computed(() => {
  const grouped = skyEntriesByYear(props.entries)
  const years = new Set<number>(grouped.keys())
  years.add(isoWeekYear(new Date(`${props.today}T00:00:00Z`)))
  return Array.from(years).sort((a, b) => b - a)
})

const sections = computed(() => yearsToRender.value.map(year => ({
  year,
  grid: gridForYear(year, props.entries, props.today),
})))

function cellClass(cell: SkyCell | null): string {
  if (cell === null) return 'pad'
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    return cell.entry.solstice ? 'has-photo solstice-halo' : 'has-photo'
  }
  return cell.kind
}

function cellStyle(cell: SkyCell | null): string {
  if (cell !== null && (cell.kind === 'has-photo' || cell.kind === 'today-with-photo')) {
    return `background-color: ${cell.entry.color}`
  }
  return ''
}

function isToday(cell: SkyCell | null): boolean {
  return cell !== null && (cell.kind === 'today-with-photo' || cell.kind === 'today-empty')
}

function onCellClick(cell: SkyCell | null): void {
  if (cell !== null && (cell.kind === 'has-photo' || cell.kind === 'today-with-photo')) {
    emit('photo-click', cell.entry)
  }
}
</script>

<template>
  <div class="sky-calendar">
    <section
      v-for="section in sections"
      :key="section.year"
      class="sky-year"
      :data-year="section.year"
    >
      <h2 class="year-label">{{ section.year }}</h2>
      <div class="grid">
        <div
          v-for="(week, w) in section.grid"
          :key="w"
          class="week-col"
        >
          <button
            v-for="(cell, d) in week"
            :key="d"
            type="button"
            class="cell"
            :class="[cellClass(cell), { today: isToday(cell) }]"
            :style="cellStyle(cell)"
            :data-date="cell?.date"
            :disabled="cell === null || (cell.kind !== 'has-photo' && cell.kind !== 'today-with-photo')"
            :title="cell?.date ?? ''"
            @click="onCellClick(cell)"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sky-calendar { display: flex; flex-direction: column; gap: 2rem; width: 100%; }
.sky-year { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
.year-label {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg-faint);
  margin: 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(53, minmax(10px, 1fr));
  gap: 3px;
  width: 100%;
}
.week-col { display: grid; grid-template-rows: repeat(7, 1fr); gap: 3px; }
.cell {
  aspect-ratio: 1;
  border: none;
  background: transparent;
  padding: 0;
  cursor: default;
  min-width: 12px;
  min-height: 12px;
  clip-path: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
  position: relative;
}
.cell.has-photo,
.cell.today-with-photo {
  cursor: pointer;
}
.cell.gap {
  background: var(--ig-fg-faint);
  opacity: 0.18;
}
.cell.future {
  background: var(--ig-fg-faint);
  opacity: 0.08;
}
.cell.today-empty {
  background: var(--ig-fg-faint);
  opacity: 0.35;
}
.cell.pad { background: transparent; }
.cell.today {
  /* clip-path masks outline; use box-shadow inset for the today ring */
  box-shadow: inset 0 0 0 2px var(--ig-yellow);
  animation: breathe 2.4s ease-in-out infinite;
}
.cell.solstice-halo {
  box-shadow: inset 0 0 0 2px var(--ig-gold);
}
.cell.today.solstice-halo {
  box-shadow: inset 0 0 0 2px var(--ig-yellow), inset 0 0 0 4px var(--ig-gold);
}
@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .cell.today { animation: none; }
}
</style>
