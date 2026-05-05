# Stage 5 — Cross-cutting Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take ig.fz.ax from "works" to "feels like ig.fz.ax" via solstice/equinox global treatment, JSON feed, sitemap, system-wide og:image (hex composites), mobile audit, accessibility pass, fz.ax cross-repo footer link, and DRY refactors.

**Architecture:** Polish layer — additive utilities, build-time generators, CSS primitives, and DRY consolidation. No new pages or routes. Manifest schema gains a single `ogSha` field. Build pipeline gains a postbuild orchestrator (`pnpm generate` runs `nuxt generate` then a postbuild script that emits og:images, feed.json, sitemap.xml into `.output/public`).

**Tech Stack:** Nuxt 3 (`ssr: true` + `nuxt generate`), TypeScript strict, Vitest + happy-dom + @vue/test-utils, sharp (already a dep), @axe-core/playwright (new dev dep, accessibility tests).

---

## Spec coverage map

| Spec area | Tasks |
|----------|-------|
| 1. Solstice/equinox global treatment | T1, T2, T6, T7, T8 |
| 2. JSON feed | T18 |
| 3. Sitemap | T19 |
| 4. og:image system-wide | T9, T10, T11, T12, T13, T14, T15, T16 |
| 5. Mobile-first refinements | T21 |
| 6. Accessibility pass | T22, T23, T24, T25, T26 |
| 7. fz.ax footer link | T28 |
| 8. DRY refactors | T3, T4, T5 |
| Build pipeline integration | T17, T20 |
| Scheduled rebuild | T27 |

---

## File inventory

**Created:**

- `composables/useSolstice.ts`
- `utils/copy.ts`
- `components/PermalinkNav.vue`
- `components/SolsticeBanner.vue`
- `scripts/lib/og-image.ts`
- `scripts/build-og-images.ts`
- `scripts/build-feed.ts`
- `scripts/build-sitemap.ts`
- `scripts/postbuild.ts` (orchestrator)
- `scripts/backfill-og-sha.ts` (one-shot)
- `public/og-brand.png` (committed asset, hand-made)
- `tests/composables/useSolstice.spec.ts`
- `tests/components/PermalinkNav.spec.ts`
- `tests/components/SolsticeBanner.spec.ts`
- `tests/scripts/lib/og-image.spec.ts`
- `tests/scripts/build-feed.spec.ts`
- `tests/scripts/build-sitemap.spec.ts`
- `tests/utils/copy.spec.ts`
- `tests/integration/build-output.spec.ts`
- `tests/integration/axe.spec.ts`
- `tests/fixtures/manifest-feed.json`
- `tests/fixtures/manifest-feed-large.json`
- `tests/fixtures/manifest-sitemap.json`
- `.github/workflows/scheduled-build.yml`

**Modified:**

- `utils/solstice.ts` — extend with `activeWindow(today)`
- `utils/manifestSchema.ts` — add `ogSha` to both entry types
- `assets/main.css` — add `--hex-clip-square`, `--hex-clip-tall`, `[data-solstice]` rules, mobile tap-target rules
- `app.vue` — read `useSolstice()`, set `data-solstice`, render `<SolsticeBanner v-if="solstice.active" />`
- `nuxt.config.ts` — inject `runtimeConfig.public.buildDate`
- `package.json` — chain postbuild orchestrator; add `backfill-og-sha`, `test:integration`, `test:axe` scripts
- `pages/sky/[year]/[month]/[day].vue`, `pages/count/[n].vue` — switch og:image to `/og/${entry.ogSha}.png`; use `<PermalinkNav>`; import `OG_FALLBACK_DESCRIPTION`
- `pages/index.vue`, `pages/sky/index.vue`, `pages/count/index.vue` — add og:image meta with fallback chain
- `components/CountField.vue` — `clip-path: var(--hex-clip-tall)`; aria-label per cell; `--hex-size: clamp(...)`
- `components/SkyCalendar.vue` — `clip-path: var(--hex-clip-square)`; aria-label per cell; verify grid `minmax(0, 1fr)`
- `components/SkyWeeksList.vue` — `clip-path: var(--hex-clip-square)`; aria-label
- `components/PhotoLightbox.vue` — `clip-path: var(--hex-clip-square)`; focus trap; touch tap-target sizes
- `scripts/add-sky.ts`, `scripts/add-count.ts` — compute `ogSha`, write to entry
- `vitest.config.ts` — exclude integration tests from default run

---

## Task list

### Task 1: Extend `utils/solstice.ts` with `activeWindow`

**Files:**
- Modify: `utils/solstice.ts`
- Test: `tests/utils/solstice.spec.ts`

The existing `solstice.ts` exposes `isSolstice(date)` and `solsticeKind(date)`. We add `activeWindow(today)` returning `{ kind, anchor } | null` where `today` falls within ±1 day of a mile-marker. `kind` reuses existing `SolsticeKind` (`'vernal' | 'summer' | 'autumnal' | 'winter'`). `anchor` is the actual mile-marker `YYYY-MM-DD`.

- [ ] **Step 1: Add failing tests**

Append to `tests/utils/solstice.spec.ts`:

```ts
import { activeWindow } from '~/utils/solstice'

describe('activeWindow', () => {
  test('returns null on day ±2 from mile-marker', () => {
    expect(activeWindow('2026-06-18')).toBeNull()
    expect(activeWindow('2026-06-23')).toBeNull()
  })

  test('returns kind and anchor for day before mile-marker', () => {
    expect(activeWindow('2026-06-20')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
  })

  test('returns kind and anchor on the exact mile-marker', () => {
    expect(activeWindow('2026-06-21')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
  })

  test('returns kind and anchor for day after mile-marker', () => {
    expect(activeWindow('2026-06-22')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
  })

  test('handles year boundaries (winter solstice in late December)', () => {
    expect(activeWindow('2025-12-21')).toEqual({ kind: 'winter', anchor: '2025-12-21' })
    expect(activeWindow('2025-12-22')).toEqual({ kind: 'winter', anchor: '2025-12-21' })
    expect(activeWindow('2025-12-20')).toEqual({ kind: 'winter', anchor: '2025-12-21' })
    expect(activeWindow('2025-12-23')).toBeNull()
  })

  test('handles all four mile-markers in 2026', () => {
    expect(activeWindow('2026-03-20')).toEqual({ kind: 'vernal', anchor: '2026-03-20' })
    expect(activeWindow('2026-06-21')).toEqual({ kind: 'summer', anchor: '2026-06-21' })
    expect(activeWindow('2026-09-23')).toEqual({ kind: 'autumnal', anchor: '2026-09-23' })
    expect(activeWindow('2026-12-21')).toEqual({ kind: 'winter', anchor: '2026-12-21' })
  })

  test('throws on invalid date format', () => {
    expect(() => activeWindow('2026/06/21')).toThrow()
    expect(() => activeWindow('not-a-date')).toThrow()
  })
})
```

- [ ] **Step 2: Run tests; expect failure**

Run: `pnpm test tests/utils/solstice.spec.ts`
Expected: FAIL — `activeWindow is not a function`.

- [ ] **Step 3: Implement `activeWindow`**

Append to `utils/solstice.ts`:

```ts
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function shiftDate(dateYYYYMMDD: string, deltaDays: number): string {
  if (!DATE_RE.test(dateYYYYMMDD)) {
    throw new Error(`invalid date "${dateYYYYMMDD}", expected YYYY-MM-DD`)
  }
  const t = Date.UTC(
    Number(dateYYYYMMDD.slice(0, 4)),
    Number(dateYYYYMMDD.slice(5, 7)) - 1,
    Number(dateYYYYMMDD.slice(8, 10)),
  )
  const shifted = new Date(t + deltaDays * 86_400_000)
  return shifted.toISOString().slice(0, 10)
}

export interface ActiveWindow { kind: SolsticeKind, anchor: string }

export function activeWindow(today: string): ActiveWindow | null {
  if (!DATE_RE.test(today)) {
    throw new Error(`invalid date "${today}", expected YYYY-MM-DD`)
  }
  for (const delta of [-1, 0, 1]) {
    const candidate = shiftDate(today, -delta)
    const kind = solsticeKind(candidate)
    if (kind !== null) return { kind, anchor: candidate }
  }
  return null
}
```

- [ ] **Step 4: Run tests; expect pass**

Run: `pnpm test tests/utils/solstice.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/solstice.ts tests/utils/solstice.spec.ts
git commit -m "feat(solstice): activeWindow returns ±1-day window around mile-markers"
```

---

### Task 2: `composables/useSolstice.ts`

**Files:**
- Create: `composables/useSolstice.ts`
- Modify: `nuxt.config.ts`
- Test: `tests/composables/useSolstice.spec.ts`

- [ ] **Step 1: Inject `buildDate` into `nuxt.config.ts`**

Add to `nuxt.config.ts` inside the config object (between `app:` and `css:`):

```ts
runtimeConfig: {
  public: {
    buildDate: process.env.BUILD_DATE ?? new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  },
},
```

- [ ] **Step 2: Add failing test**

Create `tests/composables/useSolstice.spec.ts`:

```ts
import { describe, test, expect, vi } from 'vitest'

describe('useSolstice', () => {
  test('returns active window when buildDate is a mile-marker', async () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { buildDate: '2026-06-21' },
    }))
    const { useSolstice } = await import('~/composables/useSolstice')
    const result = useSolstice()
    expect(result.active).toBe(true)
    expect(result.kind).toBe('summer')
    expect(result.anchor).toBe('2026-06-21')
    vi.unstubAllGlobals()
  })

  test('returns inactive when buildDate is not in window', async () => {
    vi.resetModules()
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: { buildDate: '2026-05-04' },
    }))
    const { useSolstice } = await import('~/composables/useSolstice')
    const result = useSolstice()
    expect(result.active).toBe(false)
    expect(result.kind).toBeNull()
    expect(result.anchor).toBeNull()
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 3: Run test; expect failure**

Run: `pnpm test tests/composables/useSolstice.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement composable**

Create `composables/useSolstice.ts`:

```ts
import { activeWindow, type SolsticeKind } from '~/utils/solstice'

export interface SolsticeState {
  active: boolean
  kind: SolsticeKind | null
  anchor: string | null
}

export function useSolstice(): SolsticeState {
  const config = useRuntimeConfig()
  const buildDate = config.public.buildDate as string
  const win = activeWindow(buildDate)
  if (win === null) return { active: false, kind: null, anchor: null }
  return { active: true, kind: win.kind, anchor: win.anchor }
}
```

- [ ] **Step 5: Run test; expect pass**

Run: `pnpm test tests/composables/useSolstice.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add composables/useSolstice.ts tests/composables/useSolstice.spec.ts nuxt.config.ts
git commit -m "feat(solstice): useSolstice composable + buildDate runtime config"
```

---

### Task 3: Hex polygon CSS vars + migrate components

**Files:**
- Modify: `assets/main.css`
- Modify: `components/CountField.vue`, `components/SkyCalendar.vue`, `components/SkyWeeksList.vue`, `components/PhotoLightbox.vue`
- Modify: `pages/count/[n].vue`

- [ ] **Step 1: Add CSS vars to `:root` in `assets/main.css`**

Open `assets/main.css`, locate the `:root { ... }` block. Add inside the block:

```css
  --hex-clip-square: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
  --hex-clip-tall: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
```

- [ ] **Step 2: Migrate `components/CountField.vue`**

In `components/CountField.vue`, replace the `clip-path: polygon(...)` line in `.count-cell` selector with:

```css
  clip-path: var(--hex-clip-tall);
```

- [ ] **Step 3: Migrate `components/SkyCalendar.vue`**

Find every `clip-path: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);` in `components/SkyCalendar.vue`. Replace with:

```css
  clip-path: var(--hex-clip-square);
```

- [ ] **Step 4: Migrate `components/SkyWeeksList.vue`**

Same find/replace in `components/SkyWeeksList.vue` for both `.hex-frame` and `.hex-cell` selectors.

- [ ] **Step 5: Migrate `components/PhotoLightbox.vue`**

Same find/replace in both `.lightbox-photo-outer` and `.lightbox-photo-frame`.

- [ ] **Step 6: Migrate `pages/count/[n].vue`**

Same find/replace in `.permalink-photo-outer` and `.permalink-photo-frame`.

- [ ] **Step 7: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 8: Manual visual verification**

Run: `pnpm dev`. In browser at `http://localhost:3000`:
- /sky calendar — hex cells render same as before
- /sky weeks — hexes render same
- /count — non-square hex cells render same
- Click any photo → lightbox hex outline renders same (yellow ring visible)
- /count/0 (any permalink) — hex frame renders same

Expected: no visual difference.

- [ ] **Step 9: Commit**

```bash
git add assets/main.css components/CountField.vue components/SkyCalendar.vue components/SkyWeeksList.vue components/PhotoLightbox.vue pages/count/\[n\].vue
git commit -m "refactor(css): hex clip-path → CSS vars (--hex-clip-square|tall)"
```

---

### Task 4: `utils/copy.ts` + permalink page migrations

**Files:**
- Create: `utils/copy.ts`
- Test: `tests/utils/copy.spec.ts`
- Modify: `pages/sky/[year]/[month]/[day].vue`, `pages/count/[n].vue`

- [ ] **Step 1: Add failing test**

Create `tests/utils/copy.spec.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'

describe('copy', () => {
  test('OG_FALLBACK_DESCRIPTION exposes the canonical site description', () => {
    expect(OG_FALLBACK_DESCRIPTION).toBe('noticing what was previously invisible')
  })
})
```

- [ ] **Step 2: Run test; expect failure**

Run: `pnpm test tests/utils/copy.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement util**

Create `utils/copy.ts`:

```ts
export const OG_FALLBACK_DESCRIPTION = 'noticing what was previously invisible'
```

- [ ] **Step 4: Migrate sky permalink page**

In `pages/sky/[year]/[month]/[day].vue`, add to top-level imports (after existing imports):

```ts
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'
```

Replace literal in the og:description meta:

Find:
```ts
{ property: 'og:description', content: 'noticing what was previously invisible' },
```

Replace:
```ts
{ property: 'og:description', content: OG_FALLBACK_DESCRIPTION },
```

- [ ] **Step 5: Migrate count permalink page**

In `pages/count/[n].vue`, add the same import. Then find:

```ts
{ property: 'og:description', content: entry.value.whisper ?? 'noticing what was previously invisible' },
```

Replace:

```ts
{ property: 'og:description', content: entry.value.whisper ?? OG_FALLBACK_DESCRIPTION },
```

- [ ] **Step 6: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add utils/copy.ts tests/utils/copy.spec.ts pages/sky/\[year\]/\[month\]/\[day\].vue pages/count/\[n\].vue
git commit -m "refactor(copy): extract OG_FALLBACK_DESCRIPTION constant"
```

---

### Task 5: `components/PermalinkNav.vue` + permalink page migrations

**Files:**
- Create: `components/PermalinkNav.vue`
- Test: `tests/components/PermalinkNav.spec.ts`
- Modify: `pages/sky/[year]/[month]/[day].vue`, `pages/count/[n].vue`

- [ ] **Step 1: Add failing test**

Create `tests/components/PermalinkNav.spec.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PermalinkNav from '~/components/PermalinkNav.vue'

describe('PermalinkNav', () => {
  test('renders all label and link unconditionally', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/sky', allLabel: 'sky' },
    })
    const links = w.findAll('a')
    expect(links.length).toBe(1)
    expect(links[0]!.attributes('href')).toBe('/sky')
    expect(links[0]!.text()).toContain('all sky')
  })

  test('renders prev when prevHref is set', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/sky', allLabel: 'sky', prevHref: '/sky/2026/05/03' },
    })
    const prev = w.find('a[href="/sky/2026/05/03"]')
    expect(prev.exists()).toBe(true)
    expect(prev.text()).toContain('previous')
  })

  test('renders next when nextHref is set', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/sky', allLabel: 'sky', nextHref: '/sky/2026/05/05' },
    })
    const next = w.find('a[href="/sky/2026/05/05"]')
    expect(next.exists()).toBe(true)
    expect(next.text()).toContain('next')
  })

  test('omits prev/next when not provided', () => {
    const w = mount(PermalinkNav, {
      props: { allHref: '/count', allLabel: 'count' },
    })
    expect(w.findAll('a').length).toBe(1)
  })
})
```

- [ ] **Step 2: Run test; expect failure**

Run: `pnpm test tests/components/PermalinkNav.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement component**

Create `components/PermalinkNav.vue`:

```vue
<script setup lang="ts">
interface Props {
  prevHref?: string | null
  allHref: string
  allLabel: string
  nextHref?: string | null
}
withDefaults(defineProps<Props>(), { prevHref: null, nextHref: null })
</script>

<template>
  <nav class="permalink-nav">
    <a v-if="prevHref !== null" :href="prevHref" class="nav-link">← previous</a>
    <a :href="allHref" class="nav-link">all {{ allLabel }}</a>
    <a v-if="nextHref !== null" :href="nextHref" class="nav-link">next →</a>
  </nav>
</template>

<style scoped>
.permalink-nav { display: flex; gap: 1.5rem; align-items: center; }
.nav-link {
  font-size: 0.85rem;
  font-variant: small-caps;
  letter-spacing: 0.1em;
  color: var(--ig-fg-faint);
  text-decoration: none;
}
.nav-link:hover { color: var(--ig-blue); }
</style>
```

- [ ] **Step 4: Run test; expect pass**

Run: `pnpm test tests/components/PermalinkNav.spec.ts`
Expected: PASS.

- [ ] **Step 5: Migrate sky permalink page**

In `pages/sky/[year]/[month]/[day].vue`, replace the entire `<nav class="permalink-nav">...</nav>` block in template with:

```vue
<PermalinkNav
  :prev-href="prevHref"
  all-href="/sky"
  all-label="sky"
  :next-href="nextHref"
/>
```

Remove the `.permalink-nav` and `.nav-link` styles from this file's `<style scoped>` block.

- [ ] **Step 6: Migrate count permalink page**

In `pages/count/[n].vue`, replace the `<nav class="permalink-nav">...</nav>` block with:

```vue
<PermalinkNav
  :prev-href="prevHref"
  all-href="/count"
  all-label="count"
  :next-href="nextHref"
/>
```

Remove the duplicated styles.

- [ ] **Step 7: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add components/PermalinkNav.vue tests/components/PermalinkNav.spec.ts pages/sky/\[year\]/\[month\]/\[day\].vue pages/count/\[n\].vue
git commit -m "refactor(permalink): extract PermalinkNav component"
```

---

### Task 6: `components/SolsticeBanner.vue`

**Files:**
- Create: `components/SolsticeBanner.vue`
- Test: `tests/components/SolsticeBanner.spec.ts`

- [ ] **Step 1: Add failing test**

Create `tests/components/SolsticeBanner.spec.ts`:

```ts
import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SolsticeBanner from '~/components/SolsticeBanner.vue'

describe('SolsticeBanner', () => {
  test('renders summer solstice with anchor date', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'summer', anchor: '2026-06-21' } })
    expect(w.text()).toContain('summer solstice')
    expect(w.text()).toContain('2026-06-21')
  })

  test('renders vernal equinox', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'vernal', anchor: '2026-03-20' } })
    expect(w.text()).toContain('vernal equinox')
  })

  test('renders autumnal equinox', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'autumnal', anchor: '2026-09-23' } })
    expect(w.text()).toContain('autumnal equinox')
  })

  test('renders winter solstice', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'winter', anchor: '2026-12-21' } })
    expect(w.text()).toContain('winter solstice')
  })

  test('aside has role=note for assistive tech', () => {
    const w = mount(SolsticeBanner, { props: { kind: 'summer', anchor: '2026-06-21' } })
    expect(w.find('aside').attributes('role')).toBe('note')
  })
})
```

- [ ] **Step 2: Run test; expect failure**

Run: `pnpm test tests/components/SolsticeBanner.spec.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement component**

Create `components/SolsticeBanner.vue`:

```vue
<script setup lang="ts">
import type { SolsticeKind } from '~/utils/solstice'

interface Props {
  kind: SolsticeKind
  anchor: string
}
const props = defineProps<Props>()

const KIND_LABEL: Record<SolsticeKind, string> = {
  vernal: 'vernal equinox',
  summer: 'summer solstice',
  autumnal: 'autumnal equinox',
  winter: 'winter solstice',
}

const label = KIND_LABEL[props.kind]
</script>

<template>
  <aside class="solstice-banner" role="note">
    <span class="mile">{{ label }}</span>
    <span class="dot">·</span>
    <time :datetime="anchor">{{ anchor }}</time>
  </aside>
</template>

<style scoped>
.solstice-banner {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  justify-content: center;
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  font-variant: small-caps;
  letter-spacing: 0.15em;
  color: var(--ig-fg-faint);
  border-bottom: 1px solid rgba(127, 127, 127, 0.2);
}
.dot { opacity: 0.5; }
</style>
```

- [ ] **Step 4: Run test; expect pass**

Run: `pnpm test tests/components/SolsticeBanner.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/SolsticeBanner.vue tests/components/SolsticeBanner.spec.ts
git commit -m "feat(solstice): SolsticeBanner component"
```

---

### Task 7: Wire `useSolstice` + `SolsticeBanner` into `app.vue`

**Files:**
- Modify: `app.vue`

- [ ] **Step 1: Update `app.vue`**

Replace the entire content of `app.vue` with:

```vue
<script setup lang="ts">
import { useSolstice } from '~/composables/useSolstice'

const solstice = useSolstice()
</script>

<template>
  <div class="site-root" :data-solstice="solstice.active ? solstice.kind : undefined">
    <SolsticeBanner v-if="solstice.active && solstice.kind !== null && solstice.anchor !== null" :kind="solstice.kind" :anchor="solstice.anchor" />
    <NuxtPage />
    <SiteFooter />
  </div>
</template>

<style>
.site-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-root > main {
  flex: 1;
}
</style>
```

- [ ] **Step 2: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 3: Manual smoke check (non-active window)**

Run: `pnpm dev`. Visit http://localhost:3000.
Expected: Banner does NOT appear (today 2026-05-04 is not in any mile-marker window).

- [ ] **Step 4: Manual smoke check (active window via env override)**

Stop dev. Run: `BUILD_DATE=2026-06-21 pnpm dev`.
Expected: Banner appears reading `summer solstice · 2026-06-21`.
Stop dev.

- [ ] **Step 5: Commit**

```bash
git add app.vue
git commit -m "feat(solstice): wire useSolstice + banner into app root"
```

---

### Task 8: `[data-solstice]` CSS rules in `main.css`

**Files:**
- Modify: `assets/main.css`

- [ ] **Step 1: Add solstice CSS block**

Append to `assets/main.css`:

```css
/* Solstice/equinox global treatment — active when [data-solstice] is set
   on .site-root (see app.vue). Color override + slowed today-pulse. */
.site-root[data-solstice] {
  --ig-bg: #0a0e1a;
  --ig-fg: #f7f7f0;
  background: var(--ig-bg);
  color: var(--ig-fg);
}

.site-root[data-solstice] .hex-frame.today {
  animation-duration: 4s;
}

@media (prefers-reduced-motion: reduce) {
  .site-root[data-solstice] .hex-frame.today {
    animation: none;
  }
}
```

- [ ] **Step 2: Run gates + manual check**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

Manual: `BUILD_DATE=2026-06-21 pnpm dev`. Visit http://localhost:3000/sky.
Expected: page background dark navy. Today indicator pulses noticeably slower.
Stop dev.

- [ ] **Step 3: Commit**

```bash
git add assets/main.css
git commit -m "feat(solstice): [data-solstice] background + slowed pulse"
```

---

### Task 9: Manifest schema — add optional `ogSha`

**Files:**
- Modify: `utils/manifestSchema.ts`
- Modify: `tests/utils/manifestSchema.spec.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/utils/manifestSchema.spec.ts`:

```ts
test('accepts entry with ogSha', () => {
  const e = {
    type: 'sky', date: '2026-05-04',
    url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
    w: 1600, h: 1200, color: '#586878', solstice: false,
    ogSha: 'a'.repeat(64),
  }
  expect(() => validateEntry(e)).not.toThrow()
})

test('accepts entry without ogSha (transitional)', () => {
  const e = {
    type: 'sky', date: '2026-05-04',
    url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
    w: 1600, h: 1200, color: '#586878', solstice: false,
  }
  expect(() => validateEntry(e)).not.toThrow()
})

test('rejects ogSha that is not 64 hex chars', () => {
  const e = {
    type: 'sky', date: '2026-05-04',
    url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
    w: 1600, h: 1200, color: '#586878', solstice: false,
    ogSha: 'too-short',
  }
  expect(() => validateEntry(e)).toThrow(/ogSha/)
})

test('rejects ogSha when present but non-string', () => {
  const e = {
    type: 'sky', date: '2026-05-04',
    url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
    w: 1600, h: 1200, color: '#586878', solstice: false,
    ogSha: 12345,
  }
  expect(() => validateEntry(e)).toThrow(/ogSha/)
})
```

- [ ] **Step 2: Run; expect failure**

Run: `pnpm test tests/utils/manifestSchema.spec.ts`
Expected: at least one assertion fails.

- [ ] **Step 3: Modify schema**

In `utils/manifestSchema.ts`:

Add to both `SkyEntry` and `CountEntry` interface bodies:

```ts
  ogSha?: string
```

After `HEX_COLOR_RE`, add:

```ts
const SHA256_RE = /^[a-f0-9]{64}$/
```

Inside `validateEntry`, after the `e.h` check and before the `if (e.type === 'sky')` block, add:

```ts
if (e.ogSha !== undefined) {
  if (typeof e.ogSha !== 'string' || !SHA256_RE.test(e.ogSha)) {
    throw new Error(`entry.ogSha must be 64 hex chars when present, got ${JSON.stringify(e.ogSha)}`)
  }
}
```

- [ ] **Step 4: Run; expect pass**

Run: `pnpm test tests/utils/manifestSchema.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add utils/manifestSchema.ts tests/utils/manifestSchema.spec.ts
git commit -m "feat(schema): add optional ogSha to manifest entries"
```

---

### Task 10: `scripts/lib/og-image.ts` — composeOgImage

**Files:**
- Create: `scripts/lib/og-image.ts`
- Test: `tests/scripts/lib/og-image.spec.ts`

- [ ] **Step 1: Add failing test**

Create `tests/scripts/lib/og-image.spec.ts`:

```ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { composeOgImage } from '~/scripts/lib/og-image'

const TMP = mkdtempSync(join(tmpdir(), 'og-image-test-'))

beforeAll(async () => {
  await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 50, b: 80 } },
  }).jpeg().toFile(join(TMP, 'photo.jpg'))
})

afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('composeOgImage', () => {
  test('writes a 1200x630 png to outPath', async () => {
    const outPath = join(TMP, 'out-default.png')
    await composeOgImage({ photoPath: join(TMP, 'photo.jpg'), caption: 'sky 2026-05-04', outPath })
    const meta = await sharp(outPath).metadata()
    expect(meta.width).toBe(1200)
    expect(meta.height).toBe(630)
    expect(meta.format).toBe('png')
    expect(statSync(outPath).size).toBeGreaterThan(1000)
  })

  test('accepts solstice variant (gold ring)', async () => {
    const outPath = join(TMP, 'out-solstice.png')
    await composeOgImage({ photoPath: join(TMP, 'photo.jpg'), caption: 'sky 2026-06-21', outPath, solstice: true })
    expect(statSync(outPath).size).toBeGreaterThan(1000)
  })
})
```

- [ ] **Step 2: Run; expect failure**

Run: `pnpm test tests/scripts/lib/og-image.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `scripts/lib/og-image.ts`:

```ts
import sharp from 'sharp'

const W = 1200
const H = 630
const HEX_BOX = 480
const RING = 6
const NAVY = '#0a0e1a'
const YELLOW = '#F7B808'
const GOLD = '#d4a017'
const TEXT_COLOR = '#f7f7f0'

function hexPath(size: number): string {
  const s = size
  return `M${0.5 * s},0 L${0.933 * s},${0.25 * s} L${0.933 * s},${0.75 * s} L${0.5 * s},${s} L${0.067 * s},${0.75 * s} L${0.067 * s},${0.25 * s} Z`
}

export interface ComposeOgImageOptions {
  photoPath: string
  caption: string
  outPath: string
  solstice?: boolean
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function composeOgImage(opts: ComposeOgImageOptions): Promise<void> {
  const ringColor = opts.solstice === true ? GOLD : YELLOW

  const outerSvg = Buffer.from(
    `<svg width="${HEX_BOX}" height="${HEX_BOX}" xmlns="http://www.w3.org/2000/svg">
      <path d="${hexPath(HEX_BOX)}" fill="${ringColor}"/>
    </svg>`,
  )

  const innerSize = HEX_BOX - RING * 2
  const innerHexMask = Buffer.from(
    `<svg width="${innerSize}" height="${innerSize}" xmlns="http://www.w3.org/2000/svg">
      <path d="${hexPath(innerSize)}" fill="white"/>
    </svg>`,
  )

  const photoClipped = await sharp(opts.photoPath)
    .resize(innerSize, innerSize, { fit: 'cover', position: 'center' })
    .composite([{ input: innerHexMask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  const captionSvg = Buffer.from(
    `<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg">
      <style>
        .cap { font: 28px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
               font-variant: small-caps; letter-spacing: 4px; fill: ${TEXT_COLOR}; }
      </style>
      <text x="50%" y="55%" text-anchor="middle" class="cap">${escapeXml(opts.caption)}</text>
    </svg>`,
  )

  const hexX = Math.floor((W - HEX_BOX) / 2)
  const hexY = Math.floor((H - HEX_BOX) / 2) - 20

  await sharp({
    create: { width: W, height: H, channels: 3, background: NAVY },
  })
    .composite([
      { input: outerSvg, left: hexX, top: hexY },
      { input: photoClipped, left: hexX + RING, top: hexY + RING },
      { input: captionSvg, left: 0, top: H - 90 },
    ])
    .png()
    .toFile(opts.outPath)
}
```

- [ ] **Step 4: Run; expect pass**

Run: `pnpm test tests/scripts/lib/og-image.spec.ts`
Expected: PASS.

- [ ] **Step 5: Manual visual sanity check**

Run a one-shot:

```bash
pnpm tsx -e "import('./scripts/lib/og-image.ts').then(m => m.composeOgImage({ photoPath: 'tests/fixtures/sample.jpg', caption: 'sky 2026-05-04', outPath: '/tmp/og-sample.png' })).then(() => console.log('wrote /tmp/og-sample.png'))"
```

Open `/tmp/og-sample.png`. Expected: navy bg, yellow hex ring around photo (hex-clipped), caption "sky 2026-05-04" below in small-caps light cream.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/og-image.ts tests/scripts/lib/og-image.spec.ts
git commit -m "feat(og-image): composeOgImage — sharp hex composite at 1200×630"
```

---

### Task 11: `scripts/build-og-images.ts` — iterate manifest

**Files:**
- Create: `scripts/build-og-images.ts`

- [ ] **Step 1: Implement**

Create `scripts/build-og-images.ts`:

```ts
#!/usr/bin/env tsx
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeOgImage } from './lib/og-image'
import { relPathFromUrl } from './lib/photo-store'
import type { Manifest, Entry } from '../utils/manifestSchema'

const OUT_DIR = '.output/public/og'

function captionFor(entry: Entry): string {
  return entry.type === 'sky' ? `sky ${entry.date}` : `the number ${entry.n}`
}

export async function buildOgImages(manifestPath = 'data/manifest.json', outDir = OUT_DIR): Promise<{ written: number, skipped: number, failed: number }> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest

  mkdirSync(outDir, { recursive: true })

  let written = 0
  let skipped = 0
  let failed = 0

  for (const entry of manifest.entries) {
    if (entry.ogSha === undefined) {
      console.warn(`og-image: skipping entry without ogSha: ${entry.type} ${entry.type === 'sky' ? entry.date : entry.n}`)
      failed++
      continue
    }
    const outPath = join(outDir, `${entry.ogSha}.png`)
    if (existsSync(outPath)) {
      skipped++
      continue
    }
    const rel = relPathFromUrl(entry.url)
    if (rel === null) {
      console.warn(`og-image: cannot resolve local path for ${entry.url}`)
      failed++
      continue
    }
    const photoPath = join('photos', rel)
    try {
      await composeOgImage({
        photoPath,
        caption: captionFor(entry),
        outPath,
        solstice: entry.type === 'sky' && entry.solstice === true,
      })
      written++
    }
    catch (err) {
      console.warn(`og-image: failed for entry: ${(err as Error).message}`)
      failed++
    }
  }

  return { written, skipped, failed }
}

async function main(): Promise<void> {
  const result = await buildOgImages()
  console.log(`og-images: wrote ${result.written}, skipped ${result.skipped}, failed ${result.failed}`)
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
```

- [ ] **Step 2: Run gates**

Run: `pnpm typecheck && pnpm lint`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-og-images.ts
git commit -m "feat(og-image): build-og-images iterates manifest with sha cache"
```

---

### Task 12: Backfill `ogSha` on existing manifest entries

**Files:**
- Create: `scripts/backfill-og-sha.ts`
- Modify: `data/manifest.json` (via running the script)
- Modify: `package.json`

- [ ] **Step 1: Implement**

Create `scripts/backfill-og-sha.ts`:

```ts
#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadManifest, saveManifest } from './lib/manifest'
import { relPathFromUrl } from './lib/photo-store'

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function backfillOgSha(manifestPath = 'data/manifest.json'): Promise<{ updated: number }> {
  const manifest = loadManifest(manifestPath)
  let updated = 0
  const next = manifest.entries.map((entry) => {
    if (entry.ogSha !== undefined) return entry
    const rel = relPathFromUrl(entry.url)
    if (rel === null) {
      throw new Error(`backfill-og-sha: cannot resolve local path for ${entry.url}`)
    }
    const bytes = readFileSync(join('photos', rel))
    const ogSha = sha256(bytes)
    updated++
    return { ...entry, ogSha }
  })
  saveManifest(manifestPath, { ...manifest, entries: next })
  return { updated }
}

async function main(): Promise<void> {
  const r = await backfillOgSha()
  console.log(`backfilled ogSha on ${r.updated} entries`)
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
```

- [ ] **Step 2: Add npm script**

Edit `package.json`. In the `"scripts"` block, add (after `"add-sky"`):

```json
    "backfill-og-sha": "tsx scripts/backfill-og-sha.ts",
```

- [ ] **Step 3: Run backfill**

Run: `pnpm backfill-og-sha`
Expected: prints `backfilled ogSha on 1 entries`. Manifest gains `ogSha: "<64 hex>"` on the existing sky entry.

- [ ] **Step 4: Verify manifest**

Inspect `data/manifest.json`. Confirm sky entry now has `ogSha` field with 64-char hex string.

- [ ] **Step 5: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add scripts/backfill-og-sha.ts data/manifest.json package.json
git commit -m "chore(manifest): backfill ogSha on existing entries"
```

---

### Task 13: Make `ogSha` required + update CLI ingestion

**Files:**
- Modify: `utils/manifestSchema.ts`
- Modify: `tests/utils/manifestSchema.spec.ts`
- Modify: `scripts/add-sky.ts`, `scripts/add-count.ts`
- Modify: `tests/scripts/add-sky.spec.ts`, `tests/scripts/add-count.spec.ts`

- [ ] **Step 1: Add failing test**

Append to `tests/utils/manifestSchema.spec.ts`:

```ts
test('rejects sky entry without ogSha (post-backfill)', () => {
  const e = {
    type: 'sky', date: '2026-05-04',
    url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg',
    w: 1600, h: 1200, color: '#586878', solstice: false,
  }
  expect(() => validateEntry(e)).toThrow(/ogSha/)
})

test('rejects count entry without ogSha (post-backfill)', () => {
  const e = {
    type: 'count', n: 47, date: '2026-05-04',
    url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/047.jpg',
    w: 1600, h: 1200,
  }
  expect(() => validateEntry(e)).toThrow(/ogSha/)
})
```

REMOVE the `accepts entry without ogSha (transitional)` test from Task 9.

- [ ] **Step 2: Run; expect at least the new tests fail**

Run: `pnpm test tests/utils/manifestSchema.spec.ts`
Expected: the two new "rejects" tests fail.

- [ ] **Step 3: Make `ogSha` required in schema**

In `utils/manifestSchema.ts`:

Change both interface declarations:

```ts
export interface SkyEntry {
  type: 'sky'
  date: string
  url: string
  w: number
  h: number
  color: string
  solstice: boolean
  ogSha: string
}

export interface CountEntry {
  type: 'count'
  n: number
  date: string
  url: string
  w: number
  h: number
  whisper?: string
  ogSha: string
}
```

Replace the existing `if (e.ogSha !== undefined) { ... }` block with:

```ts
if (typeof e.ogSha !== 'string' || !SHA256_RE.test(e.ogSha)) {
  throw new Error(`entry.ogSha must be 64 hex chars, got ${JSON.stringify(e.ogSha)}`)
}
```

- [ ] **Step 4: Update `scripts/add-sky.ts`**

In `scripts/add-sky.ts`:

Add at top of imports:

```ts
import { createHash } from 'node:crypto'
```

Inside `runAddSky`, between `savePhoto(...)` call and the `entry` literal, capture sha:

```ts
const ogSha = createHash('sha256').update(processed.buffer).digest('hex')
```

Add `ogSha` to the entry literal:

```ts
const entry: SkyEntry = {
  type: 'sky',
  date,
  url,
  w: processed.width,
  h: processed.height,
  color: processed.dominantColor,
  solstice: isSolstice(date),
  ogSha,
}
```

- [ ] **Step 5: Update `scripts/add-count.ts`**

Same imports + sha capture. Add `ogSha,` line in the count entry literal.

Use Read on `scripts/add-count.ts` first to find the entry literal, then add the field consistently with add-sky.ts.

- [ ] **Step 6: Update CLI ingestion tests**

In `tests/scripts/add-sky.spec.ts` and `tests/scripts/add-count.spec.ts`, find existing assertions on the returned entry. After existing assertions, add:

```ts
expect(entry.ogSha).toMatch(/^[a-f0-9]{64}$/)
```

(Substitute `entry` with the actual variable name from each test.)

- [ ] **Step 7: Run all tests**

Run: `pnpm test`
Expected: ALL pass.

- [ ] **Step 8: Commit**

```bash
git add utils/manifestSchema.ts tests/utils/manifestSchema.spec.ts scripts/add-sky.ts scripts/add-count.ts tests/scripts/add-sky.spec.ts tests/scripts/add-count.spec.ts
git commit -m "feat(schema): ogSha now required + CLI computes on ingest"
```

---

### Task 14: `public/og-brand.png` (committed asset)

**Files:**
- Create: `public/og-brand.png`

- [ ] **Step 1: Generate the brand asset**

Run this one-shot:

```bash
pnpm tsx -e "import('sharp').then(async ({default: sharp}) => {
  const W = 1200, H = 630;
  const hex = Buffer.from('<svg width=\"360\" height=\"360\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M180,0 L335.88,90 L335.88,270 L180,360 L24.12,270 L24.12,90 Z\" fill=\"#F7B808\" stroke=\"#0a0e1a\" stroke-width=\"6\"/><path d=\"M180,30 L309.96,105 L309.96,255 L180,330 L50.04,255 L50.04,105 Z\" fill=\"#0a0e1a\"/></svg>');
  const cap = Buffer.from('<svg width=\"1200\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"><style>.cap{font:42px -apple-system,system-ui,sans-serif;font-variant:small-caps;letter-spacing:8px;fill:#f7f7f0;}</style><text x=\"50%\" y=\"60%\" text-anchor=\"middle\" class=\"cap\">ig.fz.ax</text></svg>');
  await sharp({create:{width:W,height:H,channels:3,background:'#0a0e1a'}}).composite([{input:hex,left:420,top:115},{input:cap,left:0,top:500}]).png().toFile('public/og-brand.png');
  console.log('wrote public/og-brand.png');
})"
```

- [ ] **Step 2: Verify**

```bash
ls -la public/og-brand.png
```

Expected: file exists, size ~5–30 KB.

Open in image viewer; confirm: dark navy bg, yellow hex glyph, `ig.fz.ax` text in small-caps. Looks like brand.

- [ ] **Step 3: Commit**

```bash
git add public/og-brand.png
git commit -m "feat(og): public/og-brand.png fallback brand asset"
```

---

### Task 15: Permalink pages — switch og:image to `/og/${ogSha}.png`

**Files:**
- Modify: `pages/sky/[year]/[month]/[day].vue`
- Modify: `pages/count/[n].vue`

- [ ] **Step 1: Update sky permalink**

In `pages/sky/[year]/[month]/[day].vue`, locate the `useHead` call. Find:

```ts
{ property: 'og:image', content: entry.value.url },
```

Replace:

```ts
{ property: 'og:image', content: `/og/${entry.value.ogSha}.png` },
```

- [ ] **Step 2: Update count permalink**

In `pages/count/[n].vue`, same find/replace.

- [ ] **Step 3: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add pages/sky/\[year\]/\[month\]/\[day\].vue pages/count/\[n\].vue
git commit -m "feat(og): permalinks point og:image to /og/<sha>.png"
```

---

### Task 16: Root pages — og:image with fallback chain

**Files:**
- Modify: `composables/useManifest.ts` (add helper)
- Modify: `pages/index.vue`, `pages/sky/index.vue`, `pages/count/index.vue`

- [ ] **Step 1: Add helper to `composables/useManifest.ts`**

Read the current `composables/useManifest.ts`. Append (preserving existing exports):

```ts
import type { Entry, SkyEntry, CountEntry } from '~/utils/manifestSchema'

export function ogImageForRoot(entries: Entry[], section: 'home' | 'sky' | 'count'): string {
  function latestSky(): SkyEntry | null {
    const skies = entries.filter((e): e is SkyEntry => e.type === 'sky')
    skies.sort((a, b) => b.date.localeCompare(a.date))
    return skies[0] ?? null
  }
  function latestCount(): CountEntry | null {
    const counts = entries.filter((e): e is CountEntry => e.type === 'count')
    counts.sort((a, b) => b.date.localeCompare(a.date))
    return counts[0] ?? null
  }
  function latestAny(): Entry | null {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0] ?? null
  }
  const order: Array<() => Entry | null> =
    section === 'sky' ? [latestSky, latestAny]
    : section === 'count' ? [latestCount, latestAny]
    : [latestAny]
  for (const fn of order) {
    const e = fn()
    if (e !== null) return `/og/${e.ogSha}.png`
  }
  return '/og-brand.png'
}
```

If `Entry` import is already present, skip that line.

- [ ] **Step 2: Wire `pages/index.vue`**

In `pages/index.vue`, add to script setup:

```ts
import { ogImageForRoot, useManifest } from '~/composables/useManifest'
import { OG_FALLBACK_DESCRIPTION } from '~/utils/copy'

const manifest = useManifest()
const ogImage = ogImageForRoot(manifest.entries, 'home')

useHead({
  meta: [
    { property: 'og:title', content: 'ig.fz.ax' },
    { property: 'og:description', content: OG_FALLBACK_DESCRIPTION },
    { property: 'og:image', content: ogImage },
    { property: 'og:type', content: 'website' },
  ],
})
```

If `pages/index.vue` already calls `useHead`, merge meta entries into the existing call.

- [ ] **Step 3: Wire `pages/sky/index.vue`**

Same imports. Add:

```ts
const ogImage = ogImageForRoot(manifest.entries, 'sky')
```

In existing `useHead`, add the meta block:

```ts
useHead({
  title: 'sky · ig.fz.ax',
  meta: [
    { property: 'og:title', content: 'sky · ig.fz.ax' },
    { property: 'og:description', content: OG_FALLBACK_DESCRIPTION },
    { property: 'og:image', content: ogImage },
    { property: 'og:type', content: 'website' },
  ],
})
```

- [ ] **Step 4: Wire `pages/count/index.vue`**

Same as Step 3 with `'count'`.

- [ ] **Step 5: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add composables/useManifest.ts pages/index.vue pages/sky/index.vue pages/count/index.vue
git commit -m "feat(og): root pages og:image with fallback chain"
```

---

### Task 17: Postbuild orchestrator

**Files:**
- Create: `scripts/postbuild.ts`
- Modify: `package.json`

- [ ] **Step 1: Create the orchestrator**

Create `scripts/postbuild.ts`:

```ts
#!/usr/bin/env tsx
import { fileURLToPath } from 'node:url'
import { buildOgImages } from './build-og-images'

async function main(): Promise<void> {
  console.log('postbuild: og-images')
  const og = await buildOgImages()
  console.log(`  wrote ${og.written}, skipped ${og.skipped}, failed ${og.failed}`)
  // Tasks 18 and 19 add buildFeed() and buildSitemap() calls here.
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main().catch((err) => {
    console.error('postbuild failed:', err)
    process.exit(1)
  })
}
```

- [ ] **Step 2: Update `package.json` `generate` script**

Edit `package.json`. Change:

```json
    "generate": "nuxt generate",
```

To:

```json
    "generate": "nuxt generate && tsx scripts/postbuild.ts",
```

- [ ] **Step 3: Run a full generate locally**

Run: `pnpm generate`
Expected: nuxt generate completes, then `postbuild: og-images` runs and reports `wrote 1, skipped 0, failed 0`.

Verify: `ls .output/public/og/` shows `<sha>.png`.

- [ ] **Step 4: Run again — caching kicks in**

Run: `pnpm generate`
Expected: postbuild reports `wrote 0, skipped 1, failed 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/postbuild.ts package.json
git commit -m "feat(build): postbuild orchestrator + og-images integration"
```

---

### Task 18: `scripts/build-feed.ts` — JSON feed v1.1

**Files:**
- Create: `scripts/build-feed.ts`
- Test: `tests/scripts/build-feed.spec.ts`
- Create: `tests/fixtures/manifest-feed.json`, `tests/fixtures/manifest-feed-large.json`
- Modify: `scripts/postbuild.ts`

- [ ] **Step 1: Add small fixture**

Create `tests/fixtures/manifest-feed.json`:

```json
{
  "version": 1,
  "license": "CC0-1.0",
  "entries": [
    { "type": "sky", "date": "2026-05-04", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg", "w": 1600, "h": 1200, "color": "#586878", "solstice": false, "ogSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    { "type": "sky", "date": "2026-05-03", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-03.jpg", "w": 1600, "h": 1200, "color": "#444444", "solstice": false, "ogSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
    { "type": "sky", "date": "2026-05-02", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-02.jpg", "w": 1600, "h": 1200, "color": "#7799cc", "solstice": false, "ogSha": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" },
    { "type": "count", "n": 47, "date": "2026-05-04", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/047.jpg", "w": 1600, "h": 1200, "whisper": "found on a fire hydrant", "ogSha": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" },
    { "type": "count", "n": 1, "date": "2026-05-03", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/001.jpg", "w": 1600, "h": 1200, "ogSha": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" }
  ]
}
```

- [ ] **Step 2: Add large fixture (60 entries) for slice test**

Run this one-shot to generate `tests/fixtures/manifest-feed-large.json`:

```bash
pnpm tsx -e "
import { writeFileSync } from 'node:fs';
const entries = [];
for (let i = 0; i < 60; i++) {
  const d = new Date(Date.UTC(2026, 0, 1) + i * 86400000);
  const date = d.toISOString().slice(0, 10);
  const sha = (i % 16).toString(16).repeat(64).slice(0, 64);
  if (i % 2 === 0) {
    entries.push({ type: 'sky', date, url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/' + date + '.jpg', w: 1600, h: 1200, color: '#586878', solstice: false, ogSha: sha });
  } else {
    entries.push({ type: 'count', n: i, date, url: 'https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/' + String(i).padStart(3, '0') + '.jpg', w: 1600, h: 1200, ogSha: sha });
  }
}
writeFileSync('tests/fixtures/manifest-feed-large.json', JSON.stringify({ version: 1, license: 'CC0-1.0', entries }, null, 2));
console.log('wrote 60-entry fixture');
"
```

- [ ] **Step 3: Add failing test**

Create `tests/scripts/build-feed.spec.ts`:

```ts
import { describe, test, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildFeed } from '~/scripts/build-feed'

const TMP = mkdtempSync(join(tmpdir(), 'feed-test-'))
afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('buildFeed', () => {
  test('writes valid JSON Feed v1.1 envelope', async () => {
    const out = join(TMP, 'feed.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(feed.title).toBe('ig.fz.ax')
    expect(feed.home_page_url).toBe('https://ig.fz.ax/')
    expect(feed.feed_url).toBe('https://ig.fz.ax/feed.json')
    expect(feed.description).toBe('noticing what was previously invisible')
    expect(Array.isArray(feed.items)).toBe(true)
  })

  test('sorts entries desc by date with type tiebreaker (count before sky)', async () => {
    const out = join(TMP, 'feed-sort.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    expect(feed.items[0].id).toBe('https://ig.fz.ax/count/47')
    expect(feed.items[1].id).toBe('https://ig.fz.ax/sky/2026/05/04')
    expect(feed.items[2].id).toBe('https://ig.fz.ax/count/1')
    expect(feed.items[3].id).toBe('https://ig.fz.ax/sky/2026/05/03')
    expect(feed.items[4].id).toBe('https://ig.fz.ax/sky/2026/05/02')
  })

  test('item shape includes id, url, date_published, title, image', async () => {
    const out = join(TMP, 'feed-shape.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    const sky = feed.items.find((it: { id: string }) => it.id.includes('sky'))
    expect(sky.url).toMatch(/^https:\/\/ig\.fz\.ax\/sky\//)
    expect(sky.date_published).toMatch(/^\d{4}-\d{2}-\d{2}T12:00:00/)
    expect(sky.title).toMatch(/^sky \d{4}-\d{2}-\d{2}$/)
    expect(sky.image).toMatch(/^https:\/\/cdn\.jsdelivr\.net/)
  })

  test('count entry includes content_text when whisper present', async () => {
    const out = join(TMP, 'feed-whisper.json')
    await buildFeed('tests/fixtures/manifest-feed.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    const c47 = feed.items.find((it: { id: string }) => it.id.endsWith('/47'))
    expect(c47.content_text).toBe('found on a fire hydrant')
    const c1 = feed.items.find((it: { id: string }) => it.id.endsWith('/1'))
    expect(c1.content_text).toBeUndefined()
  })

  test('slices to 50 most-recent entries when manifest has > 50', async () => {
    const out = join(TMP, 'feed-large.json')
    await buildFeed('tests/fixtures/manifest-feed-large.json', out)
    const feed = JSON.parse(readFileSync(out, 'utf8'))
    expect(feed.items.length).toBe(50)
    const dates = feed.items.map((it: { date_published: string }) => it.date_published.slice(0, 10))
    const sorted = [...dates].sort().reverse()
    expect(dates).toEqual(sorted)
  })
})
```

- [ ] **Step 4: Run; expect failure**

Run: `pnpm test tests/scripts/build-feed.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement**

Create `scripts/build-feed.ts`:

```ts
#!/usr/bin/env tsx
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Manifest, Entry, CountEntry } from '../utils/manifestSchema'

const SITE_URL = 'https://ig.fz.ax'
const FEED_LIMIT = 50
const TZ_OFFSET = '-04:00'

function urlForEntry(e: Entry): string {
  if (e.type === 'sky') {
    const [y, m, d] = e.date.split('-')
    return `${SITE_URL}/sky/${y}/${m}/${d}`
  }
  return `${SITE_URL}/count/${e.n}`
}

function titleForEntry(e: Entry): string {
  return e.type === 'sky' ? `sky ${e.date}` : `the number ${e.n}`
}

function sortedDescByDateAndType(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    return 0
  })
}

interface FeedItem {
  id: string
  url: string
  date_published: string
  title: string
  image: string
  content_text?: string
}

function itemFor(e: Entry): FeedItem {
  const url = urlForEntry(e)
  const item: FeedItem = {
    id: url,
    url,
    date_published: `${e.date}T12:00:00${TZ_OFFSET}`,
    title: titleForEntry(e),
    image: e.url,
  }
  if (e.type === 'count' && (e as CountEntry).whisper !== undefined) {
    item.content_text = (e as CountEntry).whisper!
  }
  return item
}

export async function buildFeed(manifestPath = 'data/manifest.json', outPath = '.output/public/feed.json'): Promise<void> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest
  const items = sortedDescByDateAndType(manifest.entries).slice(0, FEED_LIMIT).map(itemFor)
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'ig.fz.ax',
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feed.json`,
    description: 'noticing what was previously invisible',
    authors: [{ name: 'fz.ax' }],
    items,
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(feed, null, 2))
}

async function main(): Promise<void> {
  await buildFeed()
  console.log('feed: wrote .output/public/feed.json')
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
```

- [ ] **Step 6: Run test; expect pass**

Run: `pnpm test tests/scripts/build-feed.spec.ts`
Expected: PASS.

- [ ] **Step 7: Wire into postbuild orchestrator**

In `scripts/postbuild.ts` add import and call:

```ts
import { buildFeed } from './build-feed'
```

After the og-images block in `main()`:

```ts
console.log('postbuild: feed')
await buildFeed()
console.log('  wrote .output/public/feed.json')
```

- [ ] **Step 8: Run pnpm generate**

Run: `pnpm generate`
Expected: postbuild reports `feed` step. `.output/public/feed.json` exists.

- [ ] **Step 9: Commit**

```bash
git add scripts/build-feed.ts scripts/postbuild.ts tests/scripts/build-feed.spec.ts tests/fixtures/manifest-feed.json tests/fixtures/manifest-feed-large.json
git commit -m "feat(feed): JSON Feed v1.1 generator + integration"
```

---

### Task 19: `scripts/build-sitemap.ts` — sitemap.xml

**Files:**
- Create: `scripts/build-sitemap.ts`
- Test: `tests/scripts/build-sitemap.spec.ts`
- Create: `tests/fixtures/manifest-sitemap.json`
- Modify: `scripts/postbuild.ts`

- [ ] **Step 1: Add fixture**

Create `tests/fixtures/manifest-sitemap.json`:

```json
{
  "version": 1,
  "license": "CC0-1.0",
  "entries": [
    { "type": "sky", "date": "2026-05-04", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-04.jpg", "w": 1600, "h": 1200, "color": "#586878", "solstice": false, "ogSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    { "type": "sky", "date": "2026-05-03", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/sky/2026-05-03.jpg", "w": 1600, "h": 1200, "color": "#444444", "solstice": false, "ogSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
    { "type": "count", "n": 47, "date": "2026-05-02", "url": "https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/count/047.jpg", "w": 1600, "h": 1200, "ogSha": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" }
  ]
}
```

- [ ] **Step 2: Add failing test**

Create `tests/scripts/build-sitemap.spec.ts`:

```ts
import { describe, test, expect, afterAll } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSitemap } from '~/scripts/build-sitemap'

const TMP = mkdtempSync(join(tmpdir(), 'sitemap-test-'))
afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('buildSitemap', () => {
  test('emits valid urlset with all expected URLs', async () => {
    const out = join(TMP, 'sitemap.xml')
    await buildSitemap('tests/fixtures/manifest-sitemap.json', out)
    const xml = readFileSync(out, 'utf8')
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(xml).toContain('<loc>https://ig.fz.ax/</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/sky</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/count</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/sky/2026/05/04</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/sky/2026/05/03</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/count/47</loc>')
    expect(xml).toContain('<loc>https://ig.fz.ax/feed.json</loc>')
  })

  test('lastmod set to max sky date for /sky', async () => {
    const out = join(TMP, 'sitemap-lastmod.xml')
    await buildSitemap('tests/fixtures/manifest-sitemap.json', out)
    const xml = readFileSync(out, 'utf8')
    const m = xml.match(/<url>\s*<loc>https:\/\/ig\.fz\.ax\/sky<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('2026-05-04')
  })

  test('per-entry lastmod equals entry date', async () => {
    const out = join(TMP, 'sitemap-perentry.xml')
    await buildSitemap('tests/fixtures/manifest-sitemap.json', out)
    const xml = readFileSync(out, 'utf8')
    const m = xml.match(/<url>\s*<loc>https:\/\/ig\.fz\.ax\/sky\/2026\/05\/03<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/)
    expect(m).not.toBeNull()
    expect(m![1]).toBe('2026-05-03')
  })
})
```

- [ ] **Step 3: Run; expect failure**

Run: `pnpm test tests/scripts/build-sitemap.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

Create `scripts/build-sitemap.ts`:

```ts
#!/usr/bin/env tsx
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Manifest, Entry, SkyEntry, CountEntry } from '../utils/manifestSchema'

const SITE_URL = 'https://ig.fz.ax'

function maxDate(entries: Entry[]): string | null {
  if (entries.length === 0) return null
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0]!.date
}

function urlEl(loc: string, lastmod: string | null): string {
  if (lastmod === null) return `  <url><loc>${loc}</loc></url>`
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
}

export async function buildSitemap(manifestPath = 'data/manifest.json', outPath = '.output/public/sitemap.xml'): Promise<void> {
  const raw = readFileSync(manifestPath, 'utf8')
  const manifest = JSON.parse(raw) as Manifest
  const skies = manifest.entries.filter((e): e is SkyEntry => e.type === 'sky')
  const counts = manifest.entries.filter((e): e is CountEntry => e.type === 'count')

  const homeMod = maxDate(manifest.entries)
  const skyMod = maxDate(skies)
  const countMod = maxDate(counts)

  const urls: string[] = [
    urlEl(`${SITE_URL}/`, homeMod),
    urlEl(`${SITE_URL}/sky`, skyMod),
    urlEl(`${SITE_URL}/count`, countMod),
    urlEl(`${SITE_URL}/feed.json`, homeMod),
  ]
  for (const e of skies) {
    const [y, m, d] = e.date.split('-')
    urls.push(urlEl(`${SITE_URL}/sky/${y}/${m}/${d}`, e.date))
  }
  for (const e of counts) {
    urls.push(urlEl(`${SITE_URL}/count/${e.n}`, e.date))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, xml)
}

async function main(): Promise<void> {
  await buildSitemap()
  console.log('sitemap: wrote .output/public/sitemap.xml')
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
```

- [ ] **Step 5: Run test; expect pass**

Run: `pnpm test tests/scripts/build-sitemap.spec.ts`
Expected: PASS.

- [ ] **Step 6: Wire into postbuild**

In `scripts/postbuild.ts` add:

```ts
import { buildSitemap } from './build-sitemap'
```

After the feed call:

```ts
console.log('postbuild: sitemap')
await buildSitemap()
console.log('  wrote .output/public/sitemap.xml')
```

- [ ] **Step 7: Full generate**

Run: `pnpm generate`
Expected: all three steps complete. `.output/public/{feed.json, sitemap.xml, og/...}` all exist.

- [ ] **Step 8: Commit**

```bash
git add scripts/build-sitemap.ts scripts/postbuild.ts tests/scripts/build-sitemap.spec.ts tests/fixtures/manifest-sitemap.json
git commit -m "feat(sitemap): sitemap.xml generator + integration"
```

---

### Task 20: Build-output integration test

**Files:**
- Create: `tests/integration/build-output.spec.ts`
- Modify: `vitest.config.ts`
- Modify: `package.json`

End-to-end check: after `pnpm generate`, the expected artifacts exist with the expected shapes. Heavy — runs the actual build, so excluded from default `pnpm test` runs.

- [ ] **Step 1: Exclude integration tests from default vitest run**

Edit `vitest.config.ts`. In `test:` config, add `exclude`:

```ts
test: {
  environment: 'happy-dom',
  globals: false,
  include: ['tests/**/*.spec.ts'],
  exclude: ['node_modules/**', '.output/**', 'tests/integration/**'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['composables/**/*.ts', 'utils/**/*.ts', 'components/**/*.vue'],
  },
},
```

- [ ] **Step 2: Add npm script**

In `package.json` `scripts`:

```json
    "test:integration": "vitest run tests/integration",
```

- [ ] **Step 3: Implement test**

Create `tests/integration/build-output.spec.ts`:

```ts
import { describe, test, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs'

describe('build output', () => {
  beforeAll(() => {
    const r = spawnSync('pnpm', ['generate'], { stdio: 'inherit', timeout: 5 * 60_000 })
    if (r.status !== 0) throw new Error(`pnpm generate failed with status ${r.status}`)
  }, 10 * 60_000)

  test('feed.json exists and is valid JSON Feed v1.1', () => {
    expect(existsSync('.output/public/feed.json')).toBe(true)
    const feed = JSON.parse(readFileSync('.output/public/feed.json', 'utf8'))
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(Array.isArray(feed.items)).toBe(true)
    for (const item of feed.items) {
      expect(typeof item.id).toBe('string')
      expect(typeof item.url).toBe('string')
      expect(typeof item.date_published).toBe('string')
    }
  })

  test('sitemap.xml exists and contains urlset', () => {
    expect(existsSync('.output/public/sitemap.xml')).toBe(true)
    const xml = readFileSync('.output/public/sitemap.xml', 'utf8')
    expect(xml).toContain('<urlset')
    expect(xml).toContain('<loc>https://ig.fz.ax/</loc>')
  })

  test('og directory has at least one PNG per entry', () => {
    expect(existsSync('.output/public/og')).toBe(true)
    const manifest = JSON.parse(readFileSync('data/manifest.json', 'utf8'))
    const files = readdirSync('.output/public/og').filter(f => f.endsWith('.png'))
    expect(files.length).toBeGreaterThanOrEqual(manifest.entries.length)
    for (const f of files) {
      expect(statSync(`.output/public/og/${f}`).size).toBeGreaterThan(1000)
    }
  })

  test('og-brand.png exists in deployed public', () => {
    expect(existsSync('.output/public/og-brand.png')).toBe(true)
  })
})
```

- [ ] **Step 4: Run integration test**

Run: `pnpm test:integration`
Expected: passes (takes a few minutes).

- [ ] **Step 5: Commit**

```bash
git add tests/integration/build-output.spec.ts vitest.config.ts package.json
git commit -m "test(integration): assert build output artifacts"
```

---

### Task 21: Mobile audit + CountField clamp + tap targets

**Files:**
- Modify: `components/CountField.vue`
- Modify: `components/PhotoLightbox.vue`
- Modify: `components/SkyCalendar.vue`

- [ ] **Step 1: Audit at 320×568**

Run: `pnpm dev`. Open http://localhost:3000 in Chrome DevTools. Toggle device toolbar. Set viewport to 320×568.

Walk: home → /sky (calendar/colorband/weeks) → /count → click any photo → close. /sky/2026/05/04 → /count/0.

Document findings to a scratch list:
- CountField hex grid overflows? (expected yes)
- SkyCalendar 7-col grid keeps cells visible?
- Lightbox close button reachable with thumb?
- View-toggle buttons all visible?

- [ ] **Step 2: Apply CountField clamp fix**

In `components/CountField.vue`, replace:

```css
.count-field {
  --hex-size: 28px;
  ...
}
@media (max-width: 700px) {
  .count-field { --hex-size: 18px; }
  .count-cell .cell-num { font-size: 0.6rem; }
}
```

With:

```css
.count-field {
  --hex-size: clamp(10px, calc(50vmin / 18), 28px);
  ...
}
@media (max-width: 700px) {
  .count-cell .cell-num { font-size: 0.6rem; }
}
```

- [ ] **Step 3: Apply PhotoLightbox touch tap targets**

In `components/PhotoLightbox.vue`, append to `<style scoped>`:

```css
@media (hover: none) {
  .chevron, .lightbox-close {
    width: 56px;
    height: 56px;
    font-size: 1.75rem;
  }
}
```

- [ ] **Step 4: Verify SkyCalendar grid**

Read `components/SkyCalendar.vue`. Locate the grid declaration (`.calendar-grid` or similar). If it uses `grid-template-columns: repeat(7, ...)` without `minmax(0, 1fr)`, replace with:

```css
grid-template-columns: repeat(7, minmax(0, 1fr));
```

If already correct, no change.

- [ ] **Step 5: Re-run audit**

`pnpm dev`. Re-walk 320 viewport. All known issues resolved.

Repeat for 375, 414, 768. Note any additional findings; fix inline; if fix exceeds the patterns above, file a follow-up issue and skip in this task.

- [ ] **Step 6: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add components/CountField.vue components/PhotoLightbox.vue components/SkyCalendar.vue
git commit -m "polish(mobile): CountField clamp + lightbox touch targets + SkyCalendar grid minmax"
```

---

### Task 22: A11y — aria-labels on grid cells

**Files:**
- Modify: `components/CountField.vue`, `components/SkyCalendar.vue`, `components/SkyWeeksList.vue`

- [ ] **Step 1: CountField aria-label**

In `components/CountField.vue`, the `<button>` for each cell has `:title="..."`. Add `:aria-label`:

Find:
```vue
:title="c.entry !== null ? `count ${c.n} · ${c.entry.date}` : `${c.n} — not yet found`"
```

Add right after (still in the `<button>` tag):
```vue
:aria-label="c.entry !== null ? `number ${c.n}, found ${c.entry.date}` : `number ${c.n}, not yet found`"
```

- [ ] **Step 2: SkyCalendar aria-label**

In `components/SkyCalendar.vue`, locate each `<button>` representing a day cell. Add:

```vue
:aria-label="cell.kind === 'has-photo' || cell.kind === 'today-with-photo' ? `${cell.date}, has photo` : `${cell.date}, no photo`"
```

(Adjust to the exact data shape used; if `cell` exposes `entry`, use that.)

- [ ] **Step 3: SkyWeeksList aria-label**

Same pattern as SkyCalendar.

- [ ] **Step 4: Run gates**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add components/CountField.vue components/SkyCalendar.vue components/SkyWeeksList.vue
git commit -m "a11y: aria-label on grid cells (sky + count)"
```

---

### Task 23: A11y — PhotoLightbox focus trap

**Files:**
- Modify: `components/PhotoLightbox.vue`
- Modify: `tests/components/PhotoLightbox.spec.ts`

- [ ] **Step 1: Add failing test**

Append to `tests/components/PhotoLightbox.spec.ts`:

```ts
test('on mount with entry, focus moves to close button', async () => {
  const w = mount(PhotoLightbox, {
    props: { entry: { url: 'x', alt: 'a', caption: 'c' }, hasPrev: true, hasNext: true },
    attachTo: document.body,
  })
  await new Promise(r => setTimeout(r, 0))
  expect(document.activeElement?.classList.contains('lightbox-close')).toBe(true)
  w.unmount()
})

test('Tab keydown is captured by trap', async () => {
  const w = mount(PhotoLightbox, {
    props: { entry: { url: 'x', alt: 'a', caption: 'c' }, hasPrev: true, hasNext: true },
    attachTo: document.body,
  })
  await new Promise(r => setTimeout(r, 0))
  const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
  document.dispatchEvent(ev)
  expect(w.find('.lightbox').exists()).toBe(true)
  w.unmount()
})
```

- [ ] **Step 2: Run; expect failure**

Run: `pnpm test tests/components/PhotoLightbox.spec.ts`
Expected: FAIL — focus does not auto-move yet.

- [ ] **Step 3: Implement focus trap**

In `components/PhotoLightbox.vue` `<script setup lang="ts">`:

Add to imports:
```ts
import { onMounted, onBeforeUnmount, watch, ref, nextTick } from 'vue'
```

Add refs and trap (preserve all existing logic):

```ts
const closeRef = ref<HTMLButtonElement | null>(null)
const prevRef = ref<HTMLButtonElement | null>(null)
const nextRef = ref<HTMLButtonElement | null>(null)

function focusables(): HTMLButtonElement[] {
  return [closeRef.value, prevRef.value, nextRef.value].filter((el): el is HTMLButtonElement => el !== null)
}

function onTrap(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return
  const items = focusables()
  if (items.length === 0) return
  e.preventDefault()
  const idx = items.indexOf(document.activeElement as HTMLButtonElement)
  const next = e.shiftKey
    ? items[(idx <= 0 ? items.length - 1 : idx - 1)]!
    : items[(idx === items.length - 1 ? 0 : idx + 1)]!
  next.focus()
}
```

Replace the existing `watch(() => props.entry, ...)` block with:

```ts
watch(() => props.entry, async (e) => {
  if (e !== null && typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onTrap)
    await nextTick()
    closeRef.value?.focus()
  }
  else if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onTrap)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onTrap)
})
```

In the template, add `ref`s:

```vue
<button v-if="hasPrev" ref="prevRef" type="button" class="chevron chevron-prev" ...>
<button v-if="hasNext" ref="nextRef" type="button" class="chevron chevron-next" ...>
<button ref="closeRef" type="button" class="lightbox-close" ...>
```

- [ ] **Step 4: Run; expect pass**

Run: `pnpm test tests/components/PhotoLightbox.spec.ts`
Expected: PASS.

- [ ] **Step 5: Manual keyboard check**

`pnpm dev`. Open /sky. Click any photo. Press Tab repeatedly. Focus should cycle close → prev (if shown) → next (if shown) → close. Press Esc — closes.

- [ ] **Step 6: Commit**

```bash
git add components/PhotoLightbox.vue tests/components/PhotoLightbox.spec.ts
git commit -m "a11y(lightbox): focus trap + initial focus on close"
```

---

### Task 24: A11y — color contrast measurement

**Files:**
- Modify: `assets/main.css` (only if measurement requires)

- [ ] **Step 1: Measure default mode**

Run: `pnpm dev`. Use Chrome DevTools accessibility inspector or a contrast checker. Sample pairs:
- `--ig-fg-faint` against `--ig-bg`

Record values. WCAG AA body text needs ≥ 4.5:1; AA large text (18pt+ or 14pt bold) needs ≥ 3:1.

- [ ] **Step 2: Measure solstice mode**

Run: `BUILD_DATE=2026-06-21 pnpm dev`. Sample `--ig-fg-faint` against the `[data-solstice]` overridden bg `#0a0e1a` (foreground inside solstice mode is `#f7f7f0`).

- [ ] **Step 3: Adjust if necessary**

If contrast < 4.5:1 in either mode for non-decorative text, brighten `--ig-fg-faint` until both modes pass. Document the new value with a CSS comment explaining why.

- [ ] **Step 4: Commit (if changes made)**

```bash
git add assets/main.css
git commit -m "a11y: bump --ig-fg-faint contrast to AA in default + solstice modes"
```

If no change needed, skip the commit. Note in the next task's commit body.

---

### Task 25: A11y — axe-core integration

**Files:**
- Create: `tests/integration/axe.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Install dev deps**

Run: `pnpm add -D @axe-core/playwright playwright @playwright/test serve`

Run: `pnpm exec playwright install chromium`

- [ ] **Step 2: Add `playwright.config.ts`**

Create `playwright.config.ts` at repo root:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/integration',
  testMatch: 'axe.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3500',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

- [ ] **Step 3: Write axe test**

Create `tests/integration/axe.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { spawn, type ChildProcess } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

let server: ChildProcess

test.beforeAll(async () => {
  server = spawn('pnpm', ['exec', 'serve', '.output/public', '-l', '3500'], { stdio: 'inherit' })
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:3500/')
      if (res.ok) return
    }
    catch {/* retry */}
    await wait(500)
  }
  throw new Error('static server failed to start')
})

test.afterAll(() => {
  server?.kill('SIGINT')
})

const ROUTES = ['/', '/sky', '/count', '/sky/2026/05/04']

for (const path of ROUTES) {
  test(`axe AA on ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:3500${path}`)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
  })
}
```

- [ ] **Step 4: Add npm script**

In `package.json`:

```json
    "test:axe": "playwright test",
```

- [ ] **Step 5: Run axe**

Run: `pnpm generate && pnpm test:axe`
Expected: all four routes pass with zero violations. If violations surface (likely candidates: missing aria, contrast, redundant landmarks), fix them inline before committing.

- [ ] **Step 6: Commit**

```bash
git add tests/integration/axe.spec.ts playwright.config.ts package.json pnpm-lock.yaml
git commit -m "test(a11y): axe-core via playwright on key routes"
```

---

### Task 26: A11y — VoiceOver pass (manual)

**Files:**
- None (documentation/checklist task; fixes go inline as separate commits)

- [ ] **Step 1: Boot a deployable build**

Run: `pnpm generate && pnpm exec serve .output/public -l 3500`

- [ ] **Step 2: VoiceOver checklist**

Enable VoiceOver (macOS: Cmd+F5). Walk:

1. **Home (/)**: VoiceOver should announce page title, then read both practice tiles with their counts. Each tile should be navigable as a link.
2. **/sky**: VoiceOver reads "sky" header, view-toggle buttons (calendar/color band/weeks), then the calendar/grid. Switching views with VO+space activates each toggle button.
3. **/count**: VoiceOver reads "count", progress text "N / 217 found", then the field. Each cell announces "number X, found <date>" or "number X, not yet found".
4. **Click a photo**: lightbox opens. VO focus lands on close button. VO+arrow walks to prev/next chevrons. VO+space on close dismisses.
5. **Permalink (/sky/2026/05/04)**: VO reads heading, image alt, caption, prev/next nav.

For each step, write any issues to a temporary scratch list.

- [ ] **Step 3: Fix found issues**

Common findings: missing alt text, button text not descriptive, redundant focus stops, missing landmarks. Fix each. Re-run VO after each fix to confirm.

- [ ] **Step 4: Commit fixes**

```bash
git add <changed files>
git commit -m "a11y: VoiceOver pass — <summary of fixes>"
```

If no fixes needed, skip commit. Note the result in the eventual final-review commit.

---

### Task 27: Scheduled rebuild GitHub Action

**Files:**
- Create: `.github/workflows/scheduled-build.yml`

- [ ] **Step 1: Inspect existing workflows**

Run: `ls .github/workflows/`. If a deploy workflow exists (`deploy.yml`, `pages.yml`, etc.), read it to understand pnpm/Node versions and deploy mechanism. Mirror those in the new workflow.

- [ ] **Step 2: Create workflow**

Create `.github/workflows/scheduled-build.yml`:

```yaml
name: Scheduled rebuild

on:
  schedule:
    - cron: '0 6 * * *'  # daily 06:00 UTC
  workflow_dispatch: {}

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm generate
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public
      - id: deployment
        uses: actions/deploy-pages@v4
```

If existing workflows differ in setup-node version, pnpm version, or deploy mechanism, mirror those instead of the values above.

- [ ] **Step 3: Validate YAML**

Visual review. If you have `yamllint` or similar, run it. Otherwise rely on GitHub's parser at push time.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/scheduled-build.yml
git commit -m "ci: scheduled daily rebuild for solstice window coverage"
```

- [ ] **Step 5: Verify after push**

After branch lands on main, verify the scheduled run appears in GitHub Actions. Manually trigger via "Run workflow" once to confirm it works.

---

### Task 28: Cross-repo — fz.ax footer link

**Files:**
- Modify (in sibling `../fz.ax` repo): footer component

- [ ] **Step 1: Locate fz.ax repo**

```bash
ls ../fz.ax 2>/dev/null && echo found || echo "fz.ax not found at ../fz.ax — find actual path"
```

If `../fz.ax` doesn't exist, find the actual path (e.g., `~/GitHub/fz.ax`) and substitute below.

- [ ] **Step 2: Locate footer**

```bash
cd ../fz.ax
grep -rn "footer\|Footer" --include="*.vue" --include="*.tsx" --include="*.ts" | head -20
```

Identify the file rendering the site footer.

- [ ] **Step 3: Add ig.fz.ax link**

Open the footer component. Find existing footer content. Add a link:

```html
<a href="https://ig.fz.ax">ig.fz.ax</a>
```

Match the existing aesthetic (small-caps, faint color, no underline). Mirror any pattern of existing external links.

- [ ] **Step 4: Run fz.ax gates**

Run whatever the fz.ax repo uses (probably `pnpm test && pnpm typecheck && pnpm lint && pnpm build`).

Expected: all green.

- [ ] **Step 5: Commit + push (in fz.ax)**

```bash
git add <changed footer file>
git commit -m "feat(footer): link to ig.fz.ax"
git push
```

- [ ] **Step 6: Verify deploy**

Wait for fz.ax's deploy. Visit https://fz.ax. Confirm footer now shows ig.fz.ax link. Click it; confirm it lands on https://ig.fz.ax.

- [ ] **Step 7: Return to ig.fz.ax repo**

```bash
cd ../photos
```

Note the fz.ax commit SHA in the final integration commit message for traceability.

---

## Final integration check

After all tasks complete:

- [ ] Run all gates: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:integration && pnpm test:axe`
- [ ] Run `pnpm generate` end-to-end
- [ ] Verify `.output/public/` contains: HTML routes, og PNGs, feed.json, sitemap.xml, og-brand.png
- [ ] Push to origin
- [ ] After deploy, manually verify on production:
  - https://ig.fz.ax/feed.json parses as JSON
  - https://ig.fz.ax/sitemap.xml parses as XML
  - https://ig.fz.ax/og-brand.png loads
  - https://ig.fz.ax/og/<sha>.png loads for at least one entry
  - On a mile-marker date (or with `BUILD_DATE` override), site renders dark navy bg with banner
  - VoiceOver narration on the live site sounds right

---

## Notes for implementers

- **Vitest happy-dom limits:** Some focus-related assertions may not behave identically to a real browser. The PhotoLightbox focus-trap test (Task 23) uses limited assertions; the manual keyboard check is the real verification.
- **playwright install:** First-time `pnpm exec playwright install chromium` downloads ~100MB. CI must run this in setup.
- **Manifest fixtures:** All test fixtures use placeholder `ogSha` values (`'a'.repeat(64)` etc). These must be 64 hex chars to satisfy the validator after Task 13.
- **CountField clamp:** The clamp formula `clamp(10px, calc(50vmin / 18), 28px)` derives from "ring 8 max extent ≈ 13.86 hex-widths, plus padding". The 18 divisor gives a safe margin. Test at 320×568.
- **`pnpm generate` runs `tsx scripts/postbuild.ts`** as part of the script chain — no separate command needed.
