# ig.fz.ax · Stage 4 — Count Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/count` — a centered hexagonal field of 217 cells (numbers 0–216), each photographed-or-not. Found cells render the photo as a hex thumbnail with a faint number overlay; unfound cells render an outlined hex with a centered faint number. Click a found cell → reuse `PhotoLightbox` with the count entry's whisper. Permalinks at `/count/N` get prerendered. Header shows `M / 217 found`. Homepage tile metric (already wired) auto-updates.

**Architecture:** A pure `utils/spiral.ts` maps each `n ∈ [0, 216]` to axial-coordinate `{q, r}` via a deterministic center-out spiral (ring 0 = center, rings 1..8 walked counter-clockwise from the east-most cell of each ring). `components/CountField.vue` renders all 217 hexes positioned by axial coords (CSS `transform: translate(...)` per cell from a precomputed pixel offset). `pages/count.vue` wires it to `useManifest` + lightbox + URL sync, reusing the same `pushState`/`replaceState` pattern as `/sky`. `pages/count/[n].vue` prerenders one HTML page per found number. `nuxt.config.ts` extends `nitro.prerender.routes` to include `/count` and one `/count/N` per existing count entry. `PhotoLightbox` gains an optional `whisper` prop displayed below the caption.

**Tech Stack:** Vue 3, Nuxt 3 (`ssr: true`, `nuxt generate`), TypeScript strict, Vitest + happy-dom + @vue/test-utils. Zero new runtime dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md` — implements **Stage 4 (Count page)**. Stage 5 (cross-cutting polish: solstice site-wide, JSON feed, sitemap, og:image system-wide, mobile-first refinements, fz.ax footer link) is out of scope.

**Pre-flight sanity check.** Before starting, confirm:

- Repo root: `pwd` → `/Users/rubberduck/GitHub/momentmaker/photos`
- Branch `master`: `git branch --show-current` → `master`
- Stage 3 complete + tagged: `git tag -l "stage-3-sky-page"` returns `stage-3-sky-page`
- Stage 3 gates green: `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm generate` all exit 0
- 113 tests passing, manifest currently has 1 sky entry (`2026-05-04`) and 0 count entries

---

## Task 1: Hex spiral algorithm

**Files:**
- Create: `utils/spiral.ts`
- Test: `tests/utils/spiral.spec.ts`

**Why:** Spec section "Spiral algorithm" mandates a fully deterministic center-out spiral. `n=0` at center; ring 1 has 6 cells, ring 2 has 12, …, ring 8 has 48. Total 1+6+12+18+24+30+36+42+48 = 217. Every later piece (CountField layout, permalink prev/next nav) consumes this.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/spiral.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { spiralCoord, ringOf, ringStart, MAX_N } from '~/utils/spiral'

describe('MAX_N', () => {
  it('is 216 (rings 0..8 totalling 217 cells)', () => {
    expect(MAX_N).toBe(216)
  })
})

describe('ringOf', () => {
  it('places n=0 in ring 0 (center)', () => {
    expect(ringOf(0)).toBe(0)
  })
  it('places n=1..6 in ring 1', () => {
    for (let n = 1; n <= 6; n++) expect(ringOf(n)).toBe(1)
  })
  it('places n=7..18 in ring 2', () => {
    for (let n = 7; n <= 18; n++) expect(ringOf(n)).toBe(2)
  })
  it('places n=169..216 in ring 8', () => {
    for (let n = 169; n <= 216; n++) expect(ringOf(n)).toBe(8)
  })
})

describe('ringStart', () => {
  it('returns the first n in each ring', () => {
    expect(ringStart(0)).toBe(0)
    expect(ringStart(1)).toBe(1)
    expect(ringStart(2)).toBe(7)
    expect(ringStart(3)).toBe(19)
    expect(ringStart(4)).toBe(37)
    expect(ringStart(5)).toBe(61)
    expect(ringStart(6)).toBe(91)
    expect(ringStart(7)).toBe(127)
    expect(ringStart(8)).toBe(169)
  })
})

describe('spiralCoord', () => {
  it('places n=0 at center (0, 0)', () => {
    expect(spiralCoord(0)).toEqual({ q: 0, r: 0 })
  })

  it('places n=1 at the east-most cell of ring 1: (1, 0)', () => {
    expect(spiralCoord(1)).toEqual({ q: 1, r: 0 })
  })

  it('places n=7 at the east-most cell of ring 2: (2, 0)', () => {
    expect(spiralCoord(7)).toEqual({ q: 2, r: 0 })
  })

  it('places n=19 at the east-most cell of ring 3: (3, 0)', () => {
    expect(spiralCoord(19)).toEqual({ q: 3, r: 0 })
  })

  it('walks ring 1 in 6 distinct cells, all at hex-distance 1', () => {
    const seen = new Set<string>()
    for (let n = 1; n <= 6; n++) {
      const { q, r } = spiralCoord(n)
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
      expect(dist).toBe(1)
      seen.add(`${q},${r}`)
    }
    expect(seen.size).toBe(6)
  })

  it('walks ring 8 in 48 distinct cells, all at hex-distance 8', () => {
    const seen = new Set<string>()
    for (let n = 169; n <= 216; n++) {
      const { q, r } = spiralCoord(n)
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r))
      expect(dist).toBe(8)
      seen.add(`${q},${r}`)
    }
    expect(seen.size).toBe(48)
  })

  it('produces 217 distinct coordinates over n=0..216', () => {
    const seen = new Set<string>()
    for (let n = 0; n <= 216; n++) {
      const { q, r } = spiralCoord(n)
      seen.add(`${q},${r}`)
    }
    expect(seen.size).toBe(217)
  })

  it('throws for n out of range', () => {
    expect(() => spiralCoord(-1)).toThrow(/0-216/)
    expect(() => spiralCoord(217)).toThrow(/0-216/)
    expect(() => spiralCoord(1.5)).toThrow(/integer/i)
  })

  it('walks ring 1 counter-clockwise from east, hitting NE next: (1, -1)', () => {
    // After (1, 0), the first step direction is N (or NE in some conventions).
    // We pin the direction order via a golden fixture: spiralCoord(2) = (1, -1).
    expect(spiralCoord(2)).toEqual({ q: 1, r: -1 })
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/utils/spiral.spec.ts
```

Expected: FAIL with "Cannot find module '~/utils/spiral'".

- [ ] **Step 3: Implement `utils/spiral.ts`**

Create `utils/spiral.ts`:

```typescript
// Centered-hex spiral. Number 0 at the center; rings 1..8 spiral outward
// counter-clockwise starting from the east-most cell of each ring.
//
// Hex axial coordinates (q, r). Distance from origin = max(|q|, |r|, |q+r|).
//
// Direction step order for the ring walk, starting from (R, 0):
//   1. NE  (+1, -1)  — walks up the right-upper face
//   2. NW  ( 0, -1)  — walks across the top face
//   3. W   (-1,  0)  — walks down the left-upper face
//   4. SW  (-1, +1)  — walks down the left-lower face
//   5. SE  ( 0, +1)  — walks across the bottom face
//   6. E   (+1,  0)  — walks up the right-lower face back to start
//
// Each side of length R steps. Together the six sides walk 6R cells.

export const MAX_N = 216  // rings 0..8 totalling 1+6+12+18+24+30+36+42+48 = 217

interface Step { dq: number, dr: number }
const SIDE_DIRS: Step[] = [
  { dq: 0,  dr: -1 },  // step from (R, 0) — first move is N (decreasing r)
  { dq: -1, dr: 0  },  // W
  { dq: -1, dr: 1  },  // SW
  { dq: 0,  dr: 1  },  // S
  { dq: 1,  dr: 0  },  // SE (back to east edge from below)
  { dq: 1,  dr: -1 },  // NE (return to start; final side never fully walked)
]

export function ringOf(n: number): number {
  if (n === 0) return 0
  // Ring R contains cells where 1 + sum_{k=1..R-1}(6k) <= n <= sum_{k=1..R}(6k)
  // sum_{k=1..R}(6k) = 3R(R+1). Cumulative count through ring R = 3R(R+1) + 1.
  let ring = 1
  while (3 * ring * (ring + 1) >= n - 0 && n > 3 * (ring - 1) * ring) {
    if (n <= 3 * ring * (ring + 1)) return ring
    ring++
  }
  // Defensive — shouldn't reach here for n in [0, MAX_N].
  while (3 * ring * (ring + 1) < n) ring++
  return ring
}

export function ringStart(ring: number): number {
  if (ring === 0) return 0
  return 3 * ring * (ring - 1) + 1
}

export function spiralCoord(n: number): { q: number, r: number } {
  if (!Number.isInteger(n)) {
    throw new Error(`n must be an integer, got ${n}`)
  }
  if (n < 0 || n > MAX_N) {
    throw new Error(`n must be in 0-${MAX_N}, got ${n}`)
  }
  if (n === 0) return { q: 0, r: 0 }
  const ring = ringOf(n)
  const idx = n - ringStart(ring)  // 0..6*ring-1
  const side = Math.floor(idx / ring)  // 0..5
  const stepInSide = idx % ring        // 0..ring-1

  // Walk: ring 1 means start at (R, 0) and step in SIDE_DIRS[0] for 1 step
  // to reach the second cell of the ring.
  let q = ring
  let r = 0
  // Walk completed sides:
  for (let s = 0; s < side; s++) {
    const d = SIDE_DIRS[s]!
    q += d.dq * ring
    r += d.dr * ring
  }
  // Step within the current side. Note: the *first* step from (R, 0) lands on
  // the second cell of the ring. To make spiralCoord(ringStart(R)) = (R, 0)
  // we pre-decrement: cell idx 0 within the ring is the start, idx 1 is one
  // step in side 0 from the start, etc.
  // In the formula above, side = floor(idx / ring), stepInSide = idx % ring.
  // For idx=0: side=0, stepInSide=0 → (R, 0) (no walk). Correct.
  // For idx=1..ring-1: side=0, stepInSide=1..ring-1 → walks SIDE_DIRS[0].
  // For idx=ring: side=1, stepInSide=0 → walks SIDE_DIRS[0] for `ring` full
  // steps (from the loop above) then 0 in side 1. Reaches end of side 0.
  const d = SIDE_DIRS[side]!
  q += d.dq * stepInSide
  r += d.dr * stepInSide
  return { q, r }
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/utils/spiral.spec.ts
```

Expected: 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils/spiral.ts tests/utils/spiral.spec.ts
git commit -m "feat(utils): hex spiral — center-out 0..216, deterministic coordinates"
```

---

## Task 2: `<CountField/>` component

**Files:**
- Create: `components/CountField.vue`
- Test: `tests/components/CountField.spec.ts`

**Why:** Renders all 217 hex cells positioned by axial coordinates. Found cells use the photo URL as `background-image`, clipped to hex shape, with the number overlaid. Unfound cells render the bare hex outline with the number centered.

- [ ] **Step 1: Write the failing test**

Create `tests/components/CountField.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CountField from '~/components/CountField.vue'
import type { CountEntry } from '~/utils/manifestSchema'

const count87: CountEntry = {
  type: 'count', n: 87, date: '2026-05-03',
  url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/087-2026-05-03.jpg',
  w: 1600, h: 1200,
  whisper: 'parking sign in astoria',
}

describe('CountField', () => {
  it('renders 217 cells', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    expect(wrapper.findAll('[data-n]').length).toBe(217)
  })

  it('marks the center cell n=0', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    const center = wrapper.find('[data-n="0"]')
    expect(center.exists()).toBe(true)
  })

  it('marks unfound cells with class unfound', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    const cell = wrapper.find('[data-n="42"]')
    expect(cell.classes()).toContain('unfound')
  })

  it('marks found cells with class found and sets the photo url as a CSS background', () => {
    const wrapper = mount(CountField, { props: { entries: [count87] } })
    const cell = wrapper.find('[data-n="87"]')
    expect(cell.classes()).toContain('found')
    expect(cell.attributes('style') ?? '').toContain(count87.url)
  })

  it('emits photo-click with the entry when a found cell is clicked', async () => {
    const wrapper = mount(CountField, { props: { entries: [count87] } })
    await wrapper.find('[data-n="87"]').trigger('click')
    const events = wrapper.emitted('photo-click') ?? []
    expect(events).toHaveLength(1)
    expect((events[0]?.[0] as CountEntry).n).toBe(87)
  })

  it('does not emit photo-click for unfound cells', async () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    await wrapper.find('[data-n="42"]').trigger('click')
    expect(wrapper.emitted('photo-click')).toBeUndefined()
  })

  it('renders the number label inside each cell', () => {
    const wrapper = mount(CountField, { props: { entries: [] } })
    const cell0 = wrapper.find('[data-n="0"]')
    const cell216 = wrapper.find('[data-n="216"]')
    expect(cell0.text()).toContain('0')
    expect(cell216.text()).toContain('216')
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/components/CountField.spec.ts
```

Expected: FAIL on missing component.

- [ ] **Step 3: Implement `components/CountField.vue`**

Create `components/CountField.vue`:

```vue
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

// Pointy-top hex axial → pixel offset in units of `size` (hex radius). The
// rendered field is a square area sized to the bounding box of ring 8.
const SQRT3 = Math.sqrt(3)

interface CellModel {
  n: number
  q: number
  r: number
  x: number  // pixel x offset in hex-radius units
  y: number  // pixel y offset in hex-radius units
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
  // Position centered around (0,0) in axial coords. Multiply x,y by hex radius
  // (controlled by --hex-size CSS var). 0.5*x because we render the whole
  // field with translate(-50%, -50%) on the inner container, so coords are
  // relative to the field center.
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
  /* Bounding box of ring 8: x extent ±8√3, y extent ±12. With size=28: */
  /*   width  ≈ 2 * 8 * √3 * 28 + hex width = ~810px */
  /*   height ≈ 2 * 12 * 28 + hex height    = ~728px */
  /* Use aspect-ratio so it scales cleanly. */
  aspect-ratio: 17 / 14;
  max-width: 900px;
  position: relative;
  margin: 0 auto;
}
.field-inner {
  position: absolute;
  inset: 0;
  /* Center coords (0,0) at the middle. Children use transform: translate. */
}
.count-cell {
  position: absolute;
  top: 50%;
  left: 50%;
  /* default centering before per-cell translate offsets the position */
  width: calc(var(--hex-size) * 1.732);  /* √3 — flat-side to flat-side */
  height: calc(var(--hex-size) * 2);     /* 2 * size — vertex to vertex */
  margin-left: calc(-1 * var(--hex-size) * 0.866);  /* center hex on (0,0) */
  margin-top: calc(-1 * var(--hex-size));
  border: none;
  padding: 0;
  background-color: transparent;
  background-size: cover;
  background-position: center;
  clip-path: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
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
  /* faint number overlay top-right per spec */
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
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/components/CountField.spec.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/CountField.vue tests/components/CountField.spec.ts
git commit -m "feat(site): CountField — 217-hex centered field, found/unfound, photo bg"
```

---

## Task 3: Extend `<PhotoLightbox/>` with optional whisper

**Files:**
- Modify: `components/PhotoLightbox.vue`
- Modify: `tests/components/PhotoLightbox.spec.ts`

**Why:** Sky photos have no whisper; count photos do. Extend the existing lightbox to accept an optional `whisper` string and render it under the caption.

- [ ] **Step 1: Add a failing test for the whisper rendering**

Append to `tests/components/PhotoLightbox.spec.ts` (inside the existing `describe('PhotoLightbox', () => { ... })` block, before the closing `})`):

```typescript
  it('renders the whisper below the caption when provided', () => {
    const wrapper = mount(PhotoLightbox, {
      props: {
        entry: {
          url: 'https://example.com/x.jpg',
          alt: 'count 87',
          caption: '87',
          whisper: 'parking sign in astoria',
        },
      },
    })
    const w = wrapper.find('.lightbox-whisper')
    expect(w.exists()).toBe(true)
    expect(w.text()).toBe('parking sign in astoria')
  })

  it('does not render the whisper element when omitted', () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' } },
    })
    expect(wrapper.find('.lightbox-whisper').exists()).toBe(false)
  })
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/components/PhotoLightbox.spec.ts
```

Expected: 2 new tests fail (`.lightbox-whisper` doesn't exist yet).

- [ ] **Step 3: Update `components/PhotoLightbox.vue`**

In `components/PhotoLightbox.vue`, modify the `LightboxEntry` interface and the template:

Find:
```typescript
export interface LightboxEntry {
  url: string
  alt: string
  caption: string
}
```

Replace with:
```typescript
export interface LightboxEntry {
  url: string
  alt: string
  caption: string
  whisper?: string
}
```

Find the figcaption block in the template:
```vue
        <figcaption class="lightbox-caption">{{ entry.caption }}</figcaption>
      </figure>
```

Replace with:
```vue
        <figcaption class="lightbox-caption">{{ entry.caption }}</figcaption>
        <p v-if="entry.whisper" class="lightbox-whisper">{{ entry.whisper }}</p>
      </figure>
```

Append to the `<style scoped>` block:
```css
.lightbox-whisper {
  margin: 0;
  font-size: 0.95rem;
  font-style: italic;
  color: rgba(247, 247, 240, 0.85);
  max-width: 80vw;
  text-align: center;
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/components/PhotoLightbox.spec.ts
```

Expected: 8 tests pass (6 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add components/PhotoLightbox.vue tests/components/PhotoLightbox.spec.ts
git commit -m "feat(site): PhotoLightbox — optional whisper line under caption"
```

---

## Task 4: `pages/count.vue` — count page wiring

**Files:**
- Create: `pages/count/index.vue`

**Why:** Hosts the CountField, header progress, lightbox, and URL sync. Mirrors the structure of `pages/sky/index.vue` but with count-specific identifiers.

We use `pages/count/index.vue` (not `pages/count.vue`) so Nuxt can also serve `pages/count/[n].vue` permalinks under the same `/count` route segment — same fix that Stage 3's `pages/sky/index.vue` uses.

- [ ] **Step 1: Create `pages/count/index.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useManifest } from '~/composables/useManifest'
import { MAX_N } from '~/utils/spiral'
import type { CountEntry } from '~/utils/manifestSchema'

useHead({
  title: 'count · ig.fz.ax',
})

const manifest = useManifest()
const countEntries = computed(() =>
  manifest.entries.filter((e): e is CountEntry => e.type === 'count'),
)

// Sorted by n ascending for prev/next stepping in the lightbox.
const sortedCounts = computed(() =>
  [...countEntries.value].sort((a, b) => a.n - b.n),
)

const found = computed(() => sortedCounts.value.length)
const total = MAX_N + 1  // 217

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

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    openIndex.value = null
  })
}
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
```

- [ ] **Step 2: Run typecheck + lint + tests**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: typecheck/lint clean. All tests pass (113 existing + new from Tasks 1, 2, 3 → ~135).

- [ ] **Step 3: Commit**

```bash
git add pages/count/index.vue
git commit -m "feat(site): /count page — 217-hex field + progress header + lightbox"
```

---

## Task 5: `/count/N` permalink page + nuxt.config update

**Files:**
- Create: `pages/count/[n].vue`
- Modify: `nuxt.config.ts`

**Why:** Spec mandates one prerendered page per found count number. Each renders the photo, the number prominently, the date, the whisper if present, and prev/next nav.

- [ ] **Step 1: Modify `nuxt.config.ts` to include count permalink routes**

Open `/Users/rubberduck/GitHub/momentmaker/photos/nuxt.config.ts`. Find the `manifestRoutes()` function (added in Stage 3 Task 8). Replace it with:

```typescript
function manifestRoutes(): string[] {
  const path = fileURLToPath(new URL('./data/manifest.json', import.meta.url))
  const raw = readFileSync(path, 'utf8')
  const parsed = JSON.parse(raw) as ManifestShape
  const out: string[] = []
  for (const entry of parsed.entries) {
    if (entry.type === 'sky') {
      const [y, m, d] = entry.date.split('-')
      out.push(`/sky/${y}/${m}/${d}`)
    }
    else if (entry.type === 'count') {
      out.push(`/count/${entry.n}`)
    }
  }
  return out
}
```

Find the `nitro.prerender.routes` line:

```typescript
      routes: ['/', '/sky', ...manifestRoutes()],
```

Replace with:

```typescript
      routes: ['/', '/sky', '/count', ...manifestRoutes()],
```

- [ ] **Step 2: Create `pages/count/[n].vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useManifest } from '~/composables/useManifest'
import type { CountEntry } from '~/utils/manifestSchema'

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
      { property: 'og:description', content: entry.value.whisper ?? 'noticing what was previously invisible' },
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
      <nav class="permalink-nav">
        <a v-if="prevHref" :href="prevHref" class="nav-link">← previous</a>
        <a href="/count" class="nav-link">all count</a>
        <a v-if="nextHref" :href="nextHref" class="nav-link">next →</a>
      </nav>
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
  clip-path: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.permalink-photo-frame {
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  clip-path: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
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
.permalink-nav { display: flex; gap: 1.5rem; align-items: center; }
.nav-link {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
}
.nav-link:hover { color: var(--ig-blue); }
.not-found { color: var(--ig-fg-faint); text-align: center; padding: 4rem 0; }
</style>
```

- [ ] **Step 3: Run typecheck + lint + tests + generate**

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm generate
ls .output/public/count/
```

Expected:
- typecheck/lint clean, all tests pass
- `.output/public/count/index.html` exists (the count field page)
- `.output/public/count/` directory exists; if a count entry has been added before this stage, `.output/public/count/<N>/index.html` would also exist. With 0 count entries today, no per-N HTML is expected.

- [ ] **Step 4: Commit**

```bash
git add pages/count/ nuxt.config.ts
git commit -m "feat(site): count permalink — /count/N prerender + og:image"
```

---

## Task 6: Add a real count photo via the CLI (smoke test the pipeline against the new page)

**Files:** none (CLI invocation + auto-generated commit by the engineer)

**Why:** With no count entries, the count permalink path can't be exercised end-to-end. Adding one real count photo confirms: (a) `pnpm add-count` still works after the jsDelivr pivot, (b) the manifest schema accepts a count entry, (c) `/count` displays it, (d) `/count/N` prerenders.

This task is **manual** and requires a real photo. If running unattended, report `BLOCKED` and ask the human to perform Steps 1–3.

- [ ] **Step 1: Pick a real count photo + run the CLI**

The author chooses a number 0–216 (whichever happens to fit a photo they have). For this smoke test, pick `n=0` and any reasonable photo (it can be anything — even a placeholder of the digit 0 found in the wild). Then:

```bash
pnpm add-count 0 ~/path/to/photo.jpg --whisper "first found"
```

Expected: prints `count 0 added: https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/000-<DATE>.jpg`. The pre-commit hook is NOT triggered yet — `pnpm add-count` only writes the manifest + photo, doesn't commit.

Verify locally:

```bash
pnpm verify
ls photos/count/
```

Expected: `pnpm verify` reports `count entries: 1 / 217`. The `photos/count/` directory contains one `000-<DATE>.jpg`.

- [ ] **Step 2: Commit + push**

```bash
git add data/manifest.json photos/count/
git commit -m "feat(content): first count photo — n=0"
git push
```

The pre-commit hook fires here and validates the manifest. Expected: `pre-commit: manifest valid (2 entries)`.

- [ ] **Step 3: Wait for the deploy and confirm the live behavior**

```bash
gh run watch --repo momentmaker/ig --exit-status
```

Then verify:

```bash
curl -sI "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/000-$(date +%Y-%m-%d).jpg" | head -3
curl -sL https://ig.fz.ax/count/ | grep -oE "data-n=\"0\"" | head -3
curl -sL https://ig.fz.ax/count/0/ | grep -oE "first found|the number 0" | head -3
```

(Substitute the actual date if it isn't today's.)

Expected: jsDelivr returns 200 for the photo (after `@latest` tag flushes — may take up to 12 hours; it's OK if this returns 404 right after deploy and 200 later in the day). The `/count` page contains `data-n="0"`. The `/count/0` permalink contains the whisper or number.

If the `pnpm verify` count includes more than 1 (e.g., the author had a previous test entry), that's fine — the smoke test just needs at least one count entry to live in the manifest.

---

## Task 7: Visual smoke + tag stage-4-count-page

**Files:** none (verification + tag)

**Why:** Closes Stage 4. Confirms the field renders, the lightbox opens, the permalink works, and the live site shows the count progress.

- [ ] **Step 1: Run dev server**

```bash
pnpm dev
```

Visit `http://localhost:3000/count`:
- Field of 217 hexes renders, centered. n=0 in middle.
- Found cells (just n=0 if Task 6 ran) show the photo as backdrop with a faint number overlay.
- Click n=0 → lightbox opens with the photo, caption "0", whisper if present. URL changes to `/count/0`.
- ESC or back closes; URL returns to `/count`.

Visit `http://localhost:3000/count/0`:
- Standalone permalink page. Big "0", hex-clipped photo, whisper, prev/next/all-count nav.

Visit `http://localhost:3000/`:
- Homepage tile metric reads `1 / 217` for the count tile.

Stop the server with `Ctrl+C`.

- [ ] **Step 2: Run all gates one more time**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all green. `.output/public/count/` contains `index.html` and (if Task 6 added n=0) `0/index.html`.

- [ ] **Step 3: Push (if anything is uncommitted) + watch the deploy**

```bash
git status
# If any of Tasks 1-5 weren't pushed in their own task, push now:
git push
gh run watch --repo momentmaker/ig --exit-status
```

Expected: build + deploy GREEN.

- [ ] **Step 4: Tag the stage**

```bash
git tag -a stage-4-count-page -m "stage 4 count page: 217-hex centered field + spiral + lightbox + permalinks"
git push origin stage-4-count-page
```

---

## Stage 4 Definition of Done

- [ ] `/count` renders all 217 cells in a centered hexagonal field, n=0 at center, n=216 at the outer ring
- [ ] Found cells show the photo as a hex-clipped background with a faint number overlay
- [ ] Unfound cells show a faint hex outline with the number centered
- [ ] Header reads `M / 217 found` derived from manifest
- [ ] Click a found cell → lightbox opens with photo + number + whisper (if present)
- [ ] Lightbox URL updates to `/count/N` via `history.pushState`
- [ ] Prev/next chevrons step through found numbers in numeric order via `replaceState`
- [ ] ESC, backdrop click, or back button closes the lightbox
- [ ] `/count/N` is prerendered as a standalone HTML page for every existing count entry
- [ ] `og:image` per permalink points at the jsDelivr URL
- [ ] Homepage tile metric updates to reflect the count of count entries (no manual change needed — `pages/index.vue` already reads from manifest)
- [ ] All Stage 4 tests pass; `pnpm typecheck && pnpm lint && pnpm test && pnpm generate` all green
- [ ] CI deploys cleanly to https://ig.fz.ax
- [ ] At least one real count photo lives in `/photos/count/` and in the manifest
- [ ] `stage-4-count-page` tag pushed

After Stage 4 is done, Stage 5 wraps up the cross-cutting polish (solstice global treatment, JSON feed, sitemap, og:image system-wide, mobile-first, fz.ax footer link, DRY refactors).
