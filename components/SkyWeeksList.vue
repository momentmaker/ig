<script setup lang="ts">
import { computed } from 'vue'
import { skyEntriesByYear, gridForYear, type SkyCell } from '~/utils/sky-grid'
import { isoWeekYear, daysInIsoWeek, isoWeeksInYear } from '~/utils/iso-week'
import type { SkyEntry } from '~/utils/manifestSchema'

interface Props {
  entries: SkyEntry[]
  today: string
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'photo-click': [entry: SkyEntry]
}>()

interface WeekRow {
  year: number
  week: number
  rangeLabel: string
  cells: SkyCell[]
  hasPhoto: boolean
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function fmtRange(days: string[]): string {
  const first = days[0]
  const last = days[6]
  if (first === undefined || last === undefined) return ''
  const [, m1, d1] = first.split('-').map(Number)
  const [, m2, d2] = last.split('-').map(Number)
  if (m1 === undefined || d1 === undefined || m2 === undefined || d2 === undefined) return ''
  if (m1 === m2) return `${MONTH_NAMES[m1 - 1]} ${d1}–${d2}`
  return `${MONTH_NAMES[m1 - 1]} ${d1} – ${MONTH_NAMES[m2 - 1]} ${d2}`
}

const rows = computed<WeekRow[]>(() => {
  const set = new Set<number>(skyEntriesByYear(props.entries).keys())
  set.add(isoWeekYear(new Date(`${props.today}T00:00:00Z`)))
  const years = Array.from(set).sort((a, b) => b - a)
  const out: WeekRow[] = []
  for (const year of years) {
    const grid = gridForYear(year, props.entries, props.today)
    const weeks = isoWeeksInYear(year)
    // Walk weeks descending so the most-recent shows first.
    for (let w = weeks; w >= 1; w--) {
      const cells = (grid[w - 1] ?? []).filter((c): c is SkyCell => c !== null)
      if (cells.length === 0) continue
      const days = daysInIsoWeek(year, w)
      out.push({
        year,
        week: w,
        rangeLabel: fmtRange(days),
        cells,
        hasPhoto: cells.some(c => c.kind === 'has-photo' || c.kind === 'today-with-photo'),
      })
    }
  }
  return out
})

function cellStyle(cell: SkyCell): string {
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    return `background-color: ${cell.entry.color}`
  }
  return ''
}

function cellClass(cell: SkyCell): string {
  const base = cell.kind
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    return cell.entry.solstice ? `${base} solstice-halo` : base
  }
  return base
}

function isToday(cell: SkyCell): boolean {
  return cell.kind === 'today-with-photo' || cell.kind === 'today-empty'
}

function isSolsticeCell(cell: SkyCell): boolean {
  return (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') && cell.entry.solstice
}

function onCellClick(cell: SkyCell): void {
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    emit('photo-click', cell.entry)
  }
}
</script>

<template>
  <div class="weeks-list">
    <article
      v-for="row in rows"
      :key="`${row.year}-${row.week}`"
      class="week-row"
      :class="{ empty: !row.hasPhoto }"
      :data-year="row.year"
      :data-week="row.week"
    >
      <header class="week-meta">
        <span class="week-num">week {{ row.week }} · {{ row.year }}</span>
        <span class="week-range">{{ row.rangeLabel }}</span>
      </header>
      <div class="week-hexes">
        <span
          v-for="cell in row.cells"
          :key="cell.date"
          class="hex-frame"
          :class="{ today: isToday(cell), 'solstice-halo': isSolsticeCell(cell) }"
        >
          <button
            type="button"
            class="hex-cell"
            :class="[cellClass(cell), { today: isToday(cell) }]"
            :style="cellStyle(cell)"
            :data-date="cell.date"
            :disabled="cell.kind !== 'has-photo' && cell.kind !== 'today-with-photo'"
            :title="cell.date"
            @click="onCellClick(cell)"
          />
        </span>
      </div>
    </article>
  </div>
</template>

<style scoped>
.weeks-list { display: flex; flex-direction: column; gap: 0.5rem; }
.week-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--ig-fg-faint);
  border-bottom-color: rgba(127, 127, 127, 0.15);
}
.week-row.empty { opacity: 0.5; }
.week-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.week-num {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg);
}
.week-range {
  font-size: 0.75rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
}
.week-hexes {
  display: grid;
  grid-template-columns: repeat(7, 28px);
  gap: 4px;
  justify-content: end;
}
.hex-frame {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  clip-path: var(--hex-clip-square);
}
.hex-frame.today {
  background: var(--ig-yellow);
  animation: breathe 2.4s ease-in-out infinite;
}
.hex-frame.solstice-halo { background: var(--ig-gold); }
.hex-cell {
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  border: none;
  background: transparent;
  padding: 0;
  cursor: default;
  clip-path: var(--hex-clip-square);
}
.hex-frame.today .hex-cell,
.hex-frame.solstice-halo .hex-cell {
  width: calc(100% - 6px);
  height: calc(100% - 6px);
}
.hex-cell.has-photo, .hex-cell.today-with-photo { cursor: pointer; }
.hex-cell.gap { background: var(--ig-fg-faint); opacity: 0.18; }
.hex-cell.future { background: var(--ig-fg-faint); opacity: 0.08; }
.hex-cell.today-empty { background: var(--ig-fg-faint); opacity: 0.35; }
@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  .hex-frame.today { animation: none; }
}
@media (max-width: 600px) {
  .week-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .week-hexes { justify-content: start; }
}
</style>
