<script setup lang="ts">
import { computed } from 'vue'
import { spiralCoord, MAX_N } from '~/utils/spiral'
import type { CountEntry } from '~/utils/manifestSchema'

interface Props {
  entries: CountEntry[]
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'photo-click': [entry: CountEntry]
}>()

const SQRT3 = Math.sqrt(3)

interface CellModel {
  n: number
  q: number
  r: number
  x: number
  y: number
  entry: CountEntry | null
}

const cells = computed<CellModel[]>(() => {
  const byN = new Map<number, CountEntry>()
  for (const e of props.entries) byN.set(e.n, e)
  const out: CellModel[] = []
  for (let n = 0; n <= MAX_N; n++) {
    const { q, r } = spiralCoord(n)
    const x = SQRT3 * (q + r / 2)
    const y = (3 / 2) * r
    out.push({ n, q, r, x, y, entry: byN.get(n) ?? null })
  }
  return out
})

function cellStyle(c: CellModel): string {
  const tx = `calc(var(--hex-size) * ${c.x.toFixed(4)})`
  const ty = `calc(var(--hex-size) * ${c.y.toFixed(4)})`
  const styleParts = [`transform: translate(${tx}, ${ty})`]
  if (c.entry !== null) {
    styleParts.push(`background-image: url('${c.entry.url}')`)
  }
  return styleParts.join('; ')
}
</script>

<template>
  <div class="count-field">
    <div class="field-inner">
      <button
        v-for="c in cells"
        :key="c.n"
        type="button"
        class="count-cell"
        :class="c.entry !== null ? 'found' : 'unfound'"
        :style="cellStyle(c)"
        :data-n="c.n"
        :disabled="c.entry === null"
        :title="c.entry !== null ? `count ${c.n} · ${c.entry.date}` : `${c.n} — not yet found`"
        @click="c.entry !== null && emit('photo-click', c.entry)"
      >
        <span class="cell-num">{{ c.n }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.count-field {
  --hex-size: 28px;
  width: 100%;
  aspect-ratio: 17 / 14;
  max-width: 900px;
  position: relative;
  margin: 0 auto;
}
.field-inner {
  position: absolute;
  inset: 0;
}
.count-cell {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(var(--hex-size) * 1.732);
  height: calc(var(--hex-size) * 2);
  margin-left: calc(-1 * var(--hex-size) * 0.866);
  margin-top: calc(-1 * var(--hex-size));
  border: none;
  padding: 0;
  background-color: transparent;
  background-size: cover;
  background-position: center;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  color: inherit;
}
.count-cell.found {
  cursor: pointer;
}
.count-cell.unfound {
  background-color: rgba(127, 127, 127, 0.08);
}
.count-cell .cell-num {
  font-size: 0.7rem;
  color: var(--ig-fg-faint);
  opacity: 0.6;
  font-variant: tabular-nums;
  pointer-events: none;
}
.count-cell.found .cell-num {
  position: absolute;
  top: 18%;
  right: 18%;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
}
@media (max-width: 700px) {
  .count-field { --hex-size: 18px; }
  .count-cell .cell-num { font-size: 0.6rem; }
}
</style>
