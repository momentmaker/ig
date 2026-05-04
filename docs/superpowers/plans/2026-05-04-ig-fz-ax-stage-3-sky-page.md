# ig.fz.ax · Stage 3 — Sky Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the manifest into the rendered site. Ship `/sky` with a 53-week × 7-day calendar grid (stacked years descending), a color-band toggle (each day a thin dominant-color stripe), a lightbox that opens on photo click and updates the URL, and individually-prerendered permalinks at `/sky/YYYY/MM/DD`. Solstice/equinox sky photos get a permanent gold halo. The homepage tile metric (`N days`) starts deriving from the manifest. After Stage 3, the first sky photo (currently `2026-05-04`) is visible from the homepage and via direct URL.

**Architecture:** Manifest data is imported at build time via a Nuxt JSON import wrapped in `composables/useManifest.ts`; with `ssr: true` the entries are inlined into every prerendered HTML page (no runtime fetch). `utils/iso-week.ts` and `utils/sky-grid.ts` are pure date/grid helpers reused by the calendar component, color-band component, and the permalink page generator. `nuxt.config.ts` reads the manifest at config-load time to populate `nitro.prerender.routes` with one `/sky/YYYY/MM/DD` per existing sky entry, so each permalink ships as a real prerendered HTML file with og:image meta. The lightbox uses `history.pushState` on first open and `history.replaceState` for prev/next navigation; closing pops back to the grid in one back-button step.

**Tech Stack:** Vue 3, Nuxt 3 (`ssr: true`, `nuxt generate`), TypeScript strict, Vitest + happy-dom + @vue/test-utils. Zero new runtime dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md` — implements **Stage 3 (Sky page)** from "Implementation order (stages)". Stage 4 (count page), Stage 5 (cross-cutting polish: solstice site-wide, JSON feed, sitemap, og:image system-wide, mobile-first refinements, fz.ax footer link) are out of scope.

**Pre-flight sanity check.** Before starting, confirm:

- You are in the `photos` repo root: `pwd` → `/Users/rubberduck/GitHub/momentmaker/photos`
- Branch `master`: `git branch --show-current` → `master`
- Stage 2 complete + tagged: `git tag -l "stage-2-cli-pipeline"` returns `stage-2-cli-pipeline`
- Stage 2 gates green: `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm generate` all exit 0
- 78 tests passing, manifest has 1 sky entry (the `2026-05-04` smoke test)

---

## Task 1: ISO-week math helpers

**Files:**
- Create: `utils/iso-week.ts`
- Test: `tests/utils/iso-week.spec.ts`

**Why:** Spec section "Display — `/sky` calendar" mandates ISO-week semantics with 53-column behavior and ISO-week-year partitioning (a December 29–31 photo may belong to the following ISO year). Stages 3 and 4 both consume this. The CLI pipeline does NOT need ISO-week math (it stores dates verbatim), so this lives in `utils/` not `scripts/lib/`.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/iso-week.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isoWeek, isoWeekYear, isoWeeksInYear, isoWeekday, daysInIsoWeek } from '~/utils/iso-week'

describe('isoWeek', () => {
  it('returns 1 for Monday Jan 4 always (ISO week 1 contains Jan 4)', () => {
    expect(isoWeek(new Date('2026-01-04T12:00:00Z'))).toBe(1)
  })
  it('returns 53 for years with 53 ISO weeks', () => {
    // 2020 is an ISO year with 53 weeks. 2020-12-31 is Thursday → week 53.
    expect(isoWeek(new Date('2020-12-31T12:00:00Z'))).toBe(53)
  })
  it('returns 1 for Dec 29-31 in years where they belong to next ISO year', () => {
    // 2025-12-29 is Monday → ISO week 1 of ISO year 2026
    expect(isoWeek(new Date('2025-12-29T12:00:00Z'))).toBe(1)
  })
  it('returns 52 for years where Jan 1 belongs to previous ISO year', () => {
    // 2026-01-01 is Thursday in calendar year 2026 but ISO week 1 of 2026 starts Dec 29 2025.
    // Jan 1 2026 is Thursday → still ISO week 1 of 2026, but 2027-01-01 is Friday → ISO week 53 of 2026.
    expect(isoWeek(new Date('2027-01-01T12:00:00Z'))).toBe(53)
  })
})

describe('isoWeekYear', () => {
  it('returns the ISO year (may differ from calendar year at boundaries)', () => {
    expect(isoWeekYear(new Date('2026-01-04T12:00:00Z'))).toBe(2026)
    expect(isoWeekYear(new Date('2025-12-29T12:00:00Z'))).toBe(2026)
    expect(isoWeekYear(new Date('2027-01-01T12:00:00Z'))).toBe(2026)
  })
})

describe('isoWeeksInYear', () => {
  it('returns 53 for known long ISO years', () => {
    expect(isoWeeksInYear(2020)).toBe(53)
    expect(isoWeeksInYear(2026)).toBe(53)
  })
  it('returns 52 for known short ISO years', () => {
    expect(isoWeeksInYear(2025)).toBe(52)
    expect(isoWeeksInYear(2027)).toBe(52)
  })
})

describe('isoWeekday', () => {
  it('returns 1..7 with Monday=1, Sunday=7', () => {
    // 2026-05-04 is Monday
    expect(isoWeekday(new Date('2026-05-04T12:00:00Z'))).toBe(1)
    // 2026-05-10 is Sunday
    expect(isoWeekday(new Date('2026-05-10T12:00:00Z'))).toBe(7)
  })
})

describe('daysInIsoWeek', () => {
  it('returns 7 dates Mon..Sun in YYYY-MM-DD format', () => {
    const days = daysInIsoWeek(2026, 19)
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-05-04')
    expect(days[6]).toBe('2026-05-10')
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/utils/iso-week.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `utils/iso-week.ts`**

Create `utils/iso-week.ts`:

```typescript
// All functions operate on UTC. Inputs in local timezone produce subtly wrong
// results at midnight; callers must pass UTC dates or YYYY-MM-DD strings via
// new Date(`${dateStr}T00:00:00Z`).

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export function isoWeekday(d: Date): number {
  // ISO weekday: Monday=1, Sunday=7. JS getUTCDay: Sunday=0, Saturday=6.
  const dow = d.getUTCDay()
  return dow === 0 ? 7 : dow
}

function thursdayOfWeek(d: Date): Date {
  // The Thursday of the same ISO week. Used because ISO weeks are pinned to
  // their Thursday for year/week computation.
  const utc = toUTCMidnight(d)
  const offset = 4 - isoWeekday(utc)  // 4 = Thursday
  utc.setUTCDate(utc.getUTCDate() + offset)
  return utc
}

export function isoWeekYear(d: Date): number {
  return thursdayOfWeek(d).getUTCFullYear()
}

export function isoWeek(d: Date): number {
  const thu = thursdayOfWeek(d)
  const jan4 = thursdayOfWeek(new Date(Date.UTC(thu.getUTCFullYear(), 0, 4)))
  const diffDays = Math.round((thu.getTime() - jan4.getTime()) / 86_400_000)
  return Math.floor(diffDays / 7) + 1
}

export function isoWeeksInYear(isoYear: number): number {
  // Year has 53 weeks if Jan 1 is Thursday or (it's a leap year and Jan 1 is Wednesday).
  const jan1 = new Date(Date.UTC(isoYear, 0, 1))
  const jan1Dow = isoWeekday(jan1)
  const isLeap = (isoYear % 4 === 0 && isoYear % 100 !== 0) || isoYear % 400 === 0
  if (jan1Dow === 4) return 53
  if (jan1Dow === 3 && isLeap) return 53
  return 52
}

export function daysInIsoWeek(isoYear: number, week: number): string[] {
  // Week 1 contains the first Thursday of the ISO year.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (isoWeekday(jan4) - 1))
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + i)
    const yyyy = day.getUTCFullYear()
    const mm = String(day.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(day.getUTCDate()).padStart(2, '0')
    out.push(`${yyyy}-${mm}-${dd}`)
  }
  return out
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/utils/iso-week.spec.ts
```

Expected: 5 describe blocks, 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils/iso-week.ts tests/utils/iso-week.spec.ts
git commit -m "feat(utils): ISO-week helpers for sky calendar grid"
```

---

## Task 2: Sky-grid derivation helper

**Files:**
- Create: `utils/sky-grid.ts`
- Test: `tests/utils/sky-grid.spec.ts`

**Why:** The calendar component needs to render years descending, each year as a 7×53 grid, with each cell labeled by its ISO-week / ISO-weekday position and the matching sky entry (if any). Pure logic; component renders the result.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/sky-grid.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { skyEntriesByYear, gridForYear, type SkyCell } from '~/utils/sky-grid'
import type { SkyEntry } from '~/utils/manifestSchema'

const sky2026: SkyEntry = {
  type: 'sky', date: '2026-05-04',
  url: 'https://storage.googleapis.com/skyphotos/2026-05-04.jpg',
  w: 1600, h: 1200, color: '#586878', solstice: false,
}

const sky2025: SkyEntry = {
  type: 'sky', date: '2025-12-29',
  url: 'https://storage.googleapis.com/skyphotos/2025-12-29.jpg',
  w: 1600, h: 1200, color: '#abc123', solstice: false,
}

describe('skyEntriesByYear', () => {
  it('groups by ISO-week-year, not calendar year', () => {
    // 2025-12-29 is Monday → ISO week 1 of ISO year 2026
    const grouped = skyEntriesByYear([sky2025, sky2026])
    expect(grouped.get(2026)).toHaveLength(2)
    expect(grouped.get(2025)).toBeUndefined()
  })

  it('returns an empty map when no sky entries', () => {
    expect(skyEntriesByYear([])).toEqual(new Map())
  })
})

describe('gridForYear', () => {
  it('returns 53 weeks × 7 days for ISO year 2026', () => {
    const grid = gridForYear(2026, [sky2026], '2026-05-04')
    expect(grid).toHaveLength(53)
    expect(grid[0]).toHaveLength(7)
  })

  it('marks the matching sky entry on its day', () => {
    // 2026-05-04 is Monday → ISO week 19, weekday 1 → grid[18][0]
    const grid = gridForYear(2026, [sky2026], '2026-05-04')
    const cell = grid[18]?.[0] as SkyCell
    expect(cell.kind).toBe('today-with-photo')
    expect(cell.entry?.date).toBe('2026-05-04')
  })

  it('marks past empty days as gap', () => {
    const grid = gridForYear(2026, [sky2026], '2026-05-04')
    // 2026-04-15 is Wednesday → ISO week 16, weekday 3 → grid[15][2]
    const cell = grid[15]?.[2] as SkyCell
    expect(cell.kind).toBe('gap')
    expect(cell.date).toBe('2026-04-15')
  })

  it('marks future empty days as future', () => {
    const grid = gridForYear(2026, [], '2026-05-04')
    // 2026-12-31 is Thursday → cell exists somewhere
    const allCells = grid.flat()
    const futureCells = allCells.filter(c => c.kind === 'future')
    expect(futureCells.length).toBeGreaterThan(0)
  })

  it('marks today (no photo) with kind: today-empty', () => {
    const grid = gridForYear(2026, [], '2026-05-04')
    const cell = grid[18]?.[0] as SkyCell
    expect(cell.kind).toBe('today-empty')
  })

  it('marks weeks beyond isoWeeksInYear as null padding', () => {
    // 2025 has only 52 ISO weeks; week 53 row should be all null
    const grid = gridForYear(2025, [], '2025-06-15')
    const week53 = grid[52]
    expect(week53?.every(c => c === null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/utils/sky-grid.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `utils/sky-grid.ts`**

Create `utils/sky-grid.ts`:

```typescript
import { isoWeek, isoWeekYear, isoWeeksInYear, isoWeekday, daysInIsoWeek } from './iso-week'
import type { SkyEntry } from './manifestSchema'

export type SkyCell =
  | { kind: 'has-photo', date: string, entry: SkyEntry }
  | { kind: 'today-with-photo', date: string, entry: SkyEntry }
  | { kind: 'today-empty', date: string }
  | { kind: 'gap', date: string }
  | { kind: 'future', date: string }

export function skyEntriesByYear(entries: SkyEntry[]): Map<number, SkyEntry[]> {
  const out = new Map<number, SkyEntry[]>()
  for (const e of entries) {
    const d = new Date(`${e.date}T00:00:00Z`)
    const year = isoWeekYear(d)
    const list = out.get(year) ?? []
    list.push(e)
    out.set(year, list)
  }
  return out
}

export function gridForYear(
  isoYear: number,
  entries: SkyEntry[],
  todayYYYYMMDD: string,
): (SkyCell | null)[][] {
  const byDate = new Map<string, SkyEntry>()
  for (const e of entries) {
    if (isoWeekYear(new Date(`${e.date}T00:00:00Z`)) === isoYear) {
      byDate.set(e.date, e)
    }
  }
  const today = todayYYYYMMDD
  const weeks = isoWeeksInYear(isoYear)
  const grid: (SkyCell | null)[][] = []
  for (let w = 1; w <= 53; w++) {
    if (w > weeks) {
      grid.push(Array.from({ length: 7 }, () => null))
      continue
    }
    const days = daysInIsoWeek(isoYear, w)
    const row: (SkyCell | null)[] = days.map((date) => {
      const entry = byDate.get(date)
      const isToday = date === today
      if (entry !== undefined) {
        return isToday
          ? { kind: 'today-with-photo', date, entry }
          : { kind: 'has-photo', date, entry }
      }
      if (isToday) return { kind: 'today-empty', date }
      if (date < today) return { kind: 'gap', date }
      return { kind: 'future', date }
    })
    grid.push(row)
  }
  return grid
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/utils/sky-grid.spec.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils/sky-grid.ts tests/utils/sky-grid.spec.ts
git commit -m "feat(utils): sky-grid — derive 53×7 grid + cell states from manifest"
```

---

## Task 3: `useManifest` composable + homepage tile metric

**Files:**
- Create: `composables/useManifest.ts`
- Modify: `pages/index.vue`
- Test: `tests/composables/useManifest.spec.ts`

**Why:** Site-side access to manifest data. With `ssr: true`, importing JSON from `~/data/manifest.json` is build-time inlined into the prerender — no fetch, no network, works without JS at runtime. The homepage tile metric (`0 days` placeholder from Stage 1) becomes `N days` derived from `entries.filter(e => e.type === 'sky').length`.

- [ ] **Step 1: Write the failing test**

Create `tests/composables/useManifest.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { useManifest } from '~/composables/useManifest'

describe('useManifest', () => {
  it('exposes the manifest with version, license, and entries', () => {
    const m = useManifest()
    expect(m.version).toBe(1)
    expect(m.license).toBe('CC0-1.0')
    expect(Array.isArray(m.entries)).toBe(true)
  })

  it('exposes typed sky/count helpers', () => {
    const m = useManifest()
    const skies = m.entries.filter(e => e.type === 'sky')
    const counts = m.entries.filter(e => e.type === 'count')
    expect(skies.every(e => e.type === 'sky')).toBe(true)
    expect(counts.every(e => e.type === 'count')).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/composables/useManifest.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `composables/useManifest.ts`**

Create `composables/useManifest.ts`:

```typescript
import manifestJson from '~/data/manifest.json'
import { validateManifest, type Manifest } from '~/utils/manifestSchema'

// Validated once at module load. Build fails (with a useful error) if the
// committed manifest violates the schema — the pre-commit hook should catch
// this earlier, but we belt-and-suspenders here too.
const data: unknown = manifestJson
validateManifest(data)
const manifest: Manifest = data

export function useManifest(): Manifest {
  return manifest
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/composables/useManifest.spec.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Modify `pages/index.vue` to derive tile metrics from the manifest**

Replace the `<script setup>` block in `pages/index.vue` with:

```vue
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
```

The template stays unchanged; `practices` shape is identical (`name`, `metric`, `href`).

- [ ] **Step 6: Run typecheck + lint + all tests + visual smoke**

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm generate
grep -oE "1 day|0 / 217" .output/public/index.html
```

Expected: typecheck/lint clean. All tests pass (78 + 2 + earlier additions). `pnpm generate` succeeds. `grep` returns `1 day` and `0 / 217` (the manifest currently has 1 sky entry, 0 count entries).

- [ ] **Step 7: Commit**

```bash
git add composables/useManifest.ts pages/index.vue tests/composables/useManifest.spec.ts
git commit -m "feat(site): useManifest composable + homepage tile metric from manifest"
```

---

## Task 4: `<SkyCalendar/>` component

**Files:**
- Create: `components/SkyCalendar.vue`
- Test: `tests/components/SkyCalendar.spec.ts`

**Why:** Renders the per-year 53×7 grid. Each cell is one of: photo thumbnail (tinted by dominant color), pulsing today, gap (faint outline), future (empty), solstice (gold halo).

- [ ] **Step 1: Write the failing test**

Create `tests/components/SkyCalendar.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkyCalendar from '~/components/SkyCalendar.vue'
import type { SkyEntry } from '~/utils/manifestSchema'

const skyEntry: SkyEntry = {
  type: 'sky', date: '2026-05-04',
  url: 'https://storage.googleapis.com/skyphotos/2026-05-04.jpg',
  w: 1600, h: 1200, color: '#586878', solstice: false,
}

const solsticeEntry: SkyEntry = {
  type: 'sky', date: '2026-12-21',
  url: 'https://storage.googleapis.com/skyphotos/2026-12-21.jpg',
  w: 1600, h: 1200, color: '#aabbcc', solstice: true,
}

describe('SkyCalendar', () => {
  it('renders one year section per ISO-year-of-entries (descending)', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [skyEntry], today: '2026-05-04' },
    })
    const sections = wrapper.findAll('.sky-year')
    expect(sections.length).toBeGreaterThanOrEqual(1)
    expect(sections[0]?.attributes('data-year')).toBe('2026')
  })

  it('renders the photo cell with backgroundColor matching dominant color', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [skyEntry], today: '2026-05-04' },
    })
    const photoCell = wrapper.find('[data-date="2026-05-04"]')
    expect(photoCell.classes()).toContain('has-photo')
    expect(photoCell.attributes('style')).toContain('#586878')
  })

  it('renders solstice cells with the solstice-halo class', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [solsticeEntry], today: '2026-12-22' },
    })
    const cell = wrapper.find('[data-date="2026-12-21"]')
    expect(cell.classes()).toContain('solstice-halo')
  })

  it('marks the today cell with class today', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [], today: '2026-05-04' },
    })
    const today = wrapper.find('[data-date="2026-05-04"]')
    expect(today.classes()).toContain('today')
  })

  it('emits photo-click with the entry when a photo cell is clicked', async () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [skyEntry], today: '2026-05-04' },
    })
    await wrapper.find('[data-date="2026-05-04"]').trigger('click')
    const events = wrapper.emitted('photo-click') ?? []
    expect(events).toHaveLength(1)
    expect((events[0]?.[0] as SkyEntry).date).toBe('2026-05-04')
  })

  it('renders empty calendar with no entries (still shows the today year)', () => {
    const wrapper = mount(SkyCalendar, {
      props: { entries: [], today: '2026-05-04' },
    })
    expect(wrapper.find('[data-year="2026"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/components/SkyCalendar.spec.ts
```

Expected: FAIL on missing component.

- [ ] **Step 3: Implement `components/SkyCalendar.vue`**

Create `components/SkyCalendar.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { skyEntriesByYear, gridForYear, type SkyCell } from '~/utils/sky-grid'
import { isoWeekYear } from '~/utils/iso-week'
import type { SkyEntry } from '~/utils/manifestSchema'

interface Props {
  entries: SkyEntry[]
  today: string  // YYYY-MM-DD
}
const props = defineProps<Props>()
const emit = defineEmits<{
  'photo-click': [entry: SkyEntry]
}>()

const yearsToRender = computed(() => {
  const grouped = skyEntriesByYear(props.entries)
  const years = new Set<number>(grouped.keys())
  // Always include the year that "today" falls in, so an empty manifest still
  // renders the current year's grid.
  years.add(isoWeekYear(new Date(`${props.today}T00:00:00Z`)))
  return Array.from(years).sort((a, b) => b - a)  // descending
})

const sections = computed(() => yearsToRender.value.map(year => ({
  year,
  grid: gridForYear(year, props.entries, props.today),
})))

function cellClass(cell: SkyCell | null): string {
  if (cell === null) return 'pad'
  const base = cell.kind
  if (cell.kind === 'has-photo' || cell.kind === 'today-with-photo') {
    return cell.entry.solstice ? `${base} solstice-halo` : base
  }
  return base
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
.sky-calendar { display: flex; flex-direction: column; gap: 2rem; }
.sky-year { display: flex; flex-direction: column; gap: 0.5rem; }
.year-label {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg-faint);
  margin: 0;
}
.grid { display: grid; grid-template-columns: repeat(53, minmax(0, 1fr)); gap: 2px; }
.week-col { display: grid; grid-template-rows: repeat(7, 1fr); gap: 2px; }
.cell {
  aspect-ratio: 1;
  border: none;
  background: transparent;
  padding: 0;
  cursor: default;
}
.cell.has-photo,
.cell.today-with-photo {
  cursor: pointer;
}
.cell.gap {
  background: transparent;
  border: 1px solid var(--ig-fg-faint);
  opacity: 0.25;
}
.cell.future, .cell.pad { background: transparent; }
.cell.today {
  outline: 2px solid var(--ig-yellow);
  outline-offset: 1px;
  animation: breathe 2.4s ease-in-out infinite;
}
.cell.solstice-halo {
  box-shadow: 0 0 0 2px var(--ig-gold);
}
@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@media (prefers-reduced-motion: reduce) {
  .cell.today { animation: none; }
}
</style>
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/components/SkyCalendar.spec.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/SkyCalendar.vue tests/components/SkyCalendar.spec.ts
git commit -m "feat(site): SkyCalendar — 53×7 grid + photo cells + solstice halo + today pulse"
```

---

## Task 5: `<SkyColorBand/>` component

**Files:**
- Create: `components/SkyColorBand.vue`
- Test: `tests/components/SkyColorBand.spec.ts`

**Why:** Same data, different visualization. Each ISO-year row becomes a strip of 365–371 thin vertical lines, each colored by that day's dominant color (or transparent for gap days). Spec describes this as "year as a 365-stripe color barcode."

- [ ] **Step 1: Write the failing test**

Create `tests/components/SkyColorBand.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkyColorBand from '~/components/SkyColorBand.vue'
import type { SkyEntry } from '~/utils/manifestSchema'

const sky: SkyEntry = {
  type: 'sky', date: '2026-05-04',
  url: 'https://storage.googleapis.com/skyphotos/2026-05-04.jpg',
  w: 1600, h: 1200, color: '#586878', solstice: false,
}

describe('SkyColorBand', () => {
  it('renders a band per ISO-year (descending)', () => {
    const wrapper = mount(SkyColorBand, {
      props: { entries: [sky], today: '2026-05-04' },
    })
    const bands = wrapper.findAll('.year-band')
    expect(bands.length).toBeGreaterThanOrEqual(1)
    expect(bands[0]?.attributes('data-year')).toBe('2026')
  })

  it('renders one stripe per day, colored when there is an entry', () => {
    const wrapper = mount(SkyColorBand, {
      props: { entries: [sky], today: '2026-05-04' },
    })
    const stripe = wrapper.find('[data-date="2026-05-04"]')
    expect(stripe.attributes('style')).toContain('#586878')
  })

  it('clicking a colored stripe emits photo-click', async () => {
    const wrapper = mount(SkyColorBand, {
      props: { entries: [sky], today: '2026-05-04' },
    })
    await wrapper.find('[data-date="2026-05-04"]').trigger('click')
    expect(wrapper.emitted('photo-click')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/components/SkyColorBand.spec.ts
```

Expected: FAIL on missing component.

- [ ] **Step 3: Implement `components/SkyColorBand.vue`**

Create `components/SkyColorBand.vue`:

```vue
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
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/components/SkyColorBand.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/SkyColorBand.vue tests/components/SkyColorBand.spec.ts
git commit -m "feat(site): SkyColorBand — year-as-barcode stripes"
```

---

## Task 6: `<PhotoLightbox/>` component

**Files:**
- Create: `components/PhotoLightbox.vue`
- Test: `tests/components/PhotoLightbox.spec.ts`

**Why:** Modal overlay rendering one photo at a time. Closes on backdrop click, ESC, or `photo-click` with `null`. Stage 4 will reuse this for `/count`. URL syncing happens in the parent page (`pages/sky.vue`), not here — this component is pure view.

- [ ] **Step 1: Write the failing test**

Create `tests/components/PhotoLightbox.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PhotoLightbox from '~/components/PhotoLightbox.vue'

describe('PhotoLightbox', () => {
  it('renders nothing when entry is null', () => {
    const wrapper = mount(PhotoLightbox, { props: { entry: null } })
    expect(wrapper.find('.lightbox').exists()).toBe(false)
  })

  it('renders the photo when entry is provided', () => {
    const wrapper = mount(PhotoLightbox, {
      props: {
        entry: {
          url: 'https://example.com/x.jpg',
          alt: 'sky on 2026-05-04',
          caption: '2026-05-04',
        },
      },
    })
    expect(wrapper.find('.lightbox').exists()).toBe(true)
    expect(wrapper.find('img.lightbox-photo').attributes('src')).toBe('https://example.com/x.jpg')
    expect(wrapper.find('img.lightbox-photo').attributes('alt')).toBe('sky on 2026-05-04')
    expect(wrapper.find('.lightbox-caption').text()).toBe('2026-05-04')
  })

  it('emits close on backdrop click', async () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' } },
    })
    await wrapper.find('.lightbox-backdrop').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits close on ESC key', async () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' } },
      attachTo: document.body,
    })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('emits prev/next on chevron click when handlers are wired', async () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' }, hasPrev: true, hasNext: true },
    })
    await wrapper.find('.chevron-prev').trigger('click')
    await wrapper.find('.chevron-next').trigger('click')
    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('hides chevrons when hasPrev/hasNext is false', () => {
    const wrapper = mount(PhotoLightbox, {
      props: { entry: { url: 'x', alt: 'a', caption: 'c' }, hasPrev: false, hasNext: false },
    })
    expect(wrapper.find('.chevron-prev').exists()).toBe(false)
    expect(wrapper.find('.chevron-next').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/components/PhotoLightbox.spec.ts
```

Expected: FAIL on missing component.

- [ ] **Step 3: Implement `components/PhotoLightbox.vue`**

Create `components/PhotoLightbox.vue`:

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'

export interface LightboxEntry {
  url: string
  alt: string
  caption: string
}

interface Props {
  entry: LightboxEntry | null
  hasPrev?: boolean
  hasNext?: boolean
}
const props = withDefaults(defineProps<Props>(), { hasPrev: false, hasNext: false })
const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

function onKey(e: KeyboardEvent): void {
  if (props.entry === null) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft' && props.hasPrev) emit('prev')
  if (e.key === 'ArrowRight' && props.hasNext) emit('next')
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})

watch(() => props.entry, (e) => {
  if (e !== null && typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }
  else if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <div v-if="entry !== null" class="lightbox" role="dialog" aria-modal="true">
    <div class="lightbox-backdrop" @click="emit('close')" />
    <button
      v-if="hasPrev"
      type="button"
      class="chevron chevron-prev"
      aria-label="previous"
      @click.stop="emit('prev')"
    >
      ←
    </button>
    <figure class="lightbox-figure">
      <img
        :src="entry.url"
        :alt="entry.alt"
        class="lightbox-photo"
      >
      <figcaption class="lightbox-caption">{{ entry.caption }}</figcaption>
    </figure>
    <button
      v-if="hasNext"
      type="button"
      class="chevron chevron-next"
      aria-label="next"
      @click.stop="emit('next')"
    >
      →
    </button>
    <button type="button" class="lightbox-close" aria-label="close" @click.stop="emit('close')">×</button>
  </div>
</template>

<style scoped>
.lightbox {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.lightbox-backdrop {
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, 0.85);
  cursor: pointer;
}
.lightbox-figure {
  position: relative; z-index: 1;
  margin: 0; padding: 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  max-width: 90vw; max-height: 90vh;
}
.lightbox-photo {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}
.lightbox-caption {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: #f7f7f0;
}
.chevron {
  position: absolute; z-index: 2;
  top: 50%; transform: translateY(-50%);
  width: 48px; height: 48px;
  background: rgba(0, 0, 0, 0.5);
  color: #f7f7f0;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
.chevron-prev { left: 1rem; }
.chevron-next { right: 1rem; }
.lightbox-close {
  position: absolute; top: 1rem; right: 1rem; z-index: 2;
  width: 48px; height: 48px;
  background: rgba(0, 0, 0, 0.5);
  color: #f7f7f0;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/components/PhotoLightbox.spec.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/PhotoLightbox.vue tests/components/PhotoLightbox.spec.ts
git commit -m "feat(site): PhotoLightbox — modal photo view + ESC + chevrons"
```

---

## Task 7: `pages/sky.vue` — calendar/color-band toggle + lightbox

**Files:**
- Create: `pages/sky.vue`

**Why:** Wires the components together. Manages the toggle (calendar vs color-band) via local state, owns the lightbox open/close + URL sync via History API.

- [ ] **Step 1: Implement `pages/sky.vue`**

Create `pages/sky.vue`:

```vue
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

const view = ref<'calendar' | 'colorband'>('calendar')

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
      </div>
    </header>

    <SkyCalendar
      v-if="view === 'calendar'"
      :entries="skyEntries"
      :today="today"
      @photo-click="openPhoto"
    />
    <SkyColorBand
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
```

- [ ] **Step 2: Run typecheck + lint + tests + visual smoke**

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm generate
grep -oE "sky" .output/public/sky/index.html | head -3
```

Expected: typecheck/lint clean, all tests pass, `.output/public/sky/index.html` contains "sky" multiple times (header + calendar cells with date data).

- [ ] **Step 3: Commit**

```bash
git add pages/sky.vue
git commit -m "feat(site): /sky page — calendar/color-band toggle + lightbox + URL sync"
```

---

## Task 8: Sky permalink prerender route

**Files:**
- Create: `pages/sky/[year]/[month]/[day].vue`
- Modify: `nuxt.config.ts`

**Why:** Spec mandates `/sky/YYYY/MM/DD` permalinks prerendered for every existing sky entry, with og:image meta and standalone-page rendering. We extend `nitro.prerender.routes` from `nuxt.config.ts` by reading `data/manifest.json` at config-load time.

- [ ] **Step 1: Modify `nuxt.config.ts` to derive prerender routes from manifest**

Open `/Users/rubberduck/GitHub/momentmaker/photos/nuxt.config.ts`. The current `nitro.prerender` block looks like:

```typescript
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/'],
      crawlLinks: false,
      failOnError: true
    }
  },
```

Replace the entire `nuxt.config.ts` with:

```typescript
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

interface SkyEntryShape { type: 'sky', date: string }
interface CountEntryShape { type: 'count', n: number }
interface ManifestShape { entries: (SkyEntryShape | CountEntryShape)[] }

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
  }
  return out
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/', '/sky', ...manifestRoutes()],
      crawlLinks: false,
      failOnError: true
    }
  },
  app: {
    baseURL: '/',
    cdnURL: '',
    head: {
      title: 'ig.fz.ax',
      meta: [
        { name: 'description', content: 'noticing what was previously invisible' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0d0d0d', media: '(prefers-color-scheme: dark)' },
        { name: 'theme-color', content: '#F7B808', media: '(prefers-color-scheme: light)' }
      ],
      link: [
        { rel: 'shortcut icon', href: '/favicon.ico' }
      ]
    }
  },
  css: ['~/assets/main.css'],
  compatibilityDate: '2026-05-03',
  devtools: { enabled: true }
})
```

- [ ] **Step 2: Create the permalink page**

Create `pages/sky/[year]/[month]/[day].vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useManifest } from '~/composables/useManifest'
import type { SkyEntry } from '~/utils/manifestSchema'

const route = useRoute()
const date = computed(() => `${route.params.year}-${route.params.month}-${route.params.day}`)

const manifest = useManifest()
const entry = computed<SkyEntry | undefined>(() =>
  manifest.entries.find(
    (e): e is SkyEntry => e.type === 'sky' && e.date === date.value,
  ),
)

useHead(() => {
  if (entry.value === undefined) return { title: 'sky · ig.fz.ax' }
  return {
    title: `sky on ${entry.value.date} · ig.fz.ax`,
    meta: [
      { property: 'og:title', content: `sky on ${entry.value.date}` },
      { property: 'og:description', content: 'noticing what was previously invisible' },
      { property: 'og:image', content: entry.value.url },
      { property: 'og:type', content: 'article' },
    ],
  }
})

const sortedSkies = computed(() =>
  manifest.entries
    .filter((e): e is SkyEntry => e.type === 'sky')
    .sort((a, b) => a.date.localeCompare(b.date)),
)
const idx = computed(() =>
  sortedSkies.value.findIndex(e => e.date === date.value),
)
const prevHref = computed(() => {
  if (idx.value <= 0) return null
  const prev = sortedSkies.value[idx.value - 1]
  if (prev === undefined) return null
  const [y, m, d] = prev.date.split('-')
  return `/sky/${y}/${m}/${d}`
})
const nextHref = computed(() => {
  if (idx.value < 0 || idx.value >= sortedSkies.value.length - 1) return null
  const next = sortedSkies.value[idx.value + 1]
  if (next === undefined) return null
  const [y, m, d] = next.date.split('-')
  return `/sky/${y}/${m}/${d}`
})
</script>

<template>
  <main class="sky-permalink">
    <p v-if="entry === undefined" class="not-found">no sky photo for {{ date }}</p>
    <article v-else class="permalink-content">
      <figure>
        <img :src="entry.url" :alt="`sky on ${entry.date}`" class="permalink-photo">
        <figcaption class="permalink-caption">{{ entry.date }}</figcaption>
      </figure>
      <nav class="permalink-nav">
        <a v-if="prevHref" :href="prevHref" class="nav-link">← previous</a>
        <a href="/sky" class="nav-link">all sky</a>
        <a v-if="nextHref" :href="nextHref" class="nav-link">next →</a>
      </nav>
    </article>
  </main>
</template>

<style scoped>
.sky-permalink { padding: 2rem 1rem; max-width: 1400px; margin: 0 auto; }
.permalink-content { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.permalink-photo { max-width: 100%; max-height: 80vh; object-fit: contain; }
.permalink-caption {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
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

- [ ] **Step 3: Run typecheck + lint + generate to verify the prerender route lands**

```bash
pnpm typecheck && pnpm lint
pnpm generate
ls .output/public/sky/2026/05/04/
grep -oE "skyphotos/2026-05-04" .output/public/sky/2026/05/04/index.html | head -3
```

Expected:
- typecheck + lint clean
- `pnpm generate` succeeds and reports "Prerendered N routes" where N includes `/sky/2026/05/04`
- Directory `.output/public/sky/2026/05/04/` exists with `index.html`
- The HTML contains the photo URL `skyphotos/2026-05-04` (proves og:image + img tag are baked)

- [ ] **Step 4: Test all gates**

```bash
pnpm test
```

Expected: all tests still pass.

- [ ] **Step 5: Commit**

```bash
git add pages/sky/ nuxt.config.ts
git commit -m "feat(site): sky permalink — /sky/YYYY/MM/DD prerender + og:image"
```

---

## Task 9: Visual smoke test + tag stage-3-sky-page

**Files:** none (verification + tag)

**Why:** Closes Stage 3. Confirms /sky renders correctly in a real browser, the lightbox opens and updates the URL, the permalink resolves directly.

- [ ] **Step 1: Run dev server and visit /sky in a browser**

```bash
pnpm dev
```

In a browser at `http://localhost:3000/sky`:
- Confirm the calendar grid renders for 2026
- The 2026-05-04 cell is colored `#586878` (sky blue-grey)
- Today's cell pulses (assuming today ≠ May 4 the May 4 cell is just colored)
- Click the cell → lightbox opens, URL changes to `http://localhost:3000/sky/2026/05/04`
- Press ESC → lightbox closes, URL returns to `/sky`
- Click "color band" toggle → grid morphs into a stripe view
- Click the colored stripe → lightbox opens
- Visit `http://localhost:3000/sky/2026/05/04` directly in a new tab → standalone permalink page renders the photo with prev/next/all-sky nav

If any of those misbehave, fix before continuing. The most likely failure is `today` mismatching when the dev day differs from any committed sky date — that's expected, the today cell still pulses but has no photo.

Stop the dev server with Ctrl+C.

- [ ] **Step 2: Run all gates one more time**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm generate
```

Expected: all green. `.output/public` contains `index.html`, `sky/index.html`, `sky/2026/05/04/index.html`.

- [ ] **Step 3: Push to master and watch the deploy**

```bash
git push
gh run watch --repo momentmaker/ig --exit-status
```

Expected: build + deploy GREEN.

- [ ] **Step 4: Confirm live behavior**

```bash
curl -sL https://ig.fz.ax/sky/ | grep -oE "skyphotos/2026-05-04" | head -3
curl -sL https://ig.fz.ax/sky/2026/05/04/ | grep -oE "skyphotos/2026-05-04" | head -3
```

Expected: both return at least one match (proves the photo URL is in the prerendered HTML).

- [ ] **Step 5: Tag the stage**

```bash
git tag -a stage-3-sky-page -m "stage 3 sky page: calendar + color band + lightbox + permalinks + solstice halo"
git push origin stage-3-sky-page
```

---

## Stage 3 Definition of Done

- [ ] `/sky` calendar grid renders 53×7 per ISO year, descending
- [ ] Color-band toggle swaps grid for 365-stripe-per-year barcode
- [ ] Photo cells/stripes are tinted by their dominant color
- [ ] Today's cell pulses (2.4s breathing animation)
- [ ] Solstice sky photos render with a permanent gold halo
- [ ] Click a photo → lightbox opens with photo + date caption
- [ ] Lightbox URL updates to `/sky/YYYY/MM/DD` via `history.pushState`
- [ ] Prev/next chevrons step through entries via `replaceState`
- [ ] ESC, backdrop click, or back button closes the lightbox
- [ ] `/sky/YYYY/MM/DD` is prerendered as a standalone HTML page for every existing sky entry
- [ ] og:image meta on each permalink points at the GCS URL
- [ ] Homepage tile metric reads `N days` derived from manifest (was `0 days` from Stage 1)
- [ ] All Stage 3 tests pass; `pnpm typecheck && pnpm lint && pnpm test && pnpm generate` all green
- [ ] CI deploys cleanly to https://ig.fz.ax
- [ ] `stage-3-sky-page` tag pushed
- [ ] `/count` route still 404 (Stage 4)

After Stage 3 lands, write the Stage 4 plan (count page — 217-hex centered field, spiral algorithm, lightbox reuse, count permalinks).
