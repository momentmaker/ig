---
title: ig.fz.ax Stage 5 — Cross-cutting Polish
date: 2026-05-04
status: draft
---

# ig.fz.ax Stage 5 — Cross-cutting Polish

## Purpose

Stages 1–4 shipped foundations, CLI pipeline, the sky page, and the count page. Stage 5 is the cross-cutting polish layer that takes the site from "works" to "feels like ig.fz.ax." It implements the remaining items from §"Implementation order (stages)" of the design doc, plus DRY refactors that surfaced during stages 3–4 review.

This spec covers eight areas:

1. Solstice/equinox global treatment (site-wide visual transform during 3-day window around mile-marker days)
2. JSON feed (`/feed.json`)
3. Sitemap (`/sitemap.xml`)
4. og:image system-wide (per-permalink hex composites + root-page coverage)
5. Mobile-first refinements (full audit at 320/375/414/768 viewports)
6. Accessibility pass (axe-core + manual VoiceOver + lightbox focus trap)
7. fz.ax footer link change (cross-repo task — add ig.fz.ax link to fz.ax footer)
8. DRY refactors (og:description constant, permalink-nav component, hex polygon CSS vars)

No new pages or routes. Manifest schema gains a single `ogSha` field on both entry types; no other schema changes. No new runtime dependencies (axe-core/playwright is dev-only via tests). All work is additive (utilities, build hooks, CSS primitives) or DRY consolidation of existing code.

## Architecture

### New utility files

- `utils/solstice.ts` — pure date math. Exports:
  - `type Mile = 'vernal-equinox' | 'summer-solstice' | 'autumnal-equinox' | 'winter-solstice'`
  - `function mileMarkerForDate(date: string): Mile | null` — returns mile if `date` (YYYY-MM-DD in author TZ) is a mile-marker, else null. Uses NOAA-formula approximation per year (good to within minutes; only date precision needed).
  - `function activeWindow(today: string): { mile: Mile, anchor: string } | null` — returns active window if `today` is within ±1 day of a mile-marker. `anchor` = the mile-marker date itself.
- `composables/useSolstice.ts` — Vue composable wrapping `activeWindow(BUILD_DATE)`. Returns `{ active: boolean, mile: Mile | null, anchor: string | null }`.
- `scripts/lib/og-image.ts` — sharp-based composer. Exports `composeOgImage(opts: { photoPath: string, caption: string, outPath: string }): Promise<void>`. Reads photo bytes from local repo (`photos/sky/...` / `photos/count/...`), composites navy bg + yellow hex ring + photo (hex-clipped) + small-caps caption, writes 1200×630 PNG.
- `scripts/build-og-images.ts` — iterates manifest, calls `composeOgImage` for each entry. Caches by photo content hash (`<sha256>.png`); skips if file exists.
- `scripts/build-feed.ts` — emits `.output/public/feed.json` (JSON Feed v1.1).
- `scripts/build-sitemap.ts` — emits `.output/public/sitemap.xml`.
- `utils/copy.ts` — shared strings. Exports `OG_FALLBACK_DESCRIPTION = 'noticing what was previously invisible'`.

### New shared component

- `components/PermalinkNav.vue` — props `prevHref?: string`, `allHref: string`, `allLabel: string`, `nextHref?: string`. Renders `← previous · all <label> · next →` with the same styling already used in sky and count permalink pages. Replaces duplicated nav blocks.
- `components/SolsticeBanner.vue` — props `mile: Mile`, `anchor: string`. Renders small-caps mile name + anchor date as a `role="note"` aside under the page header. Hidden by default; rendered only when `useSolstice().active === true`.

### CSS additions (`assets/main.css`, global)

```css
:root {
  --hex-clip-square: polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%);
  --hex-clip-tall: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

[data-solstice] {
  --ig-bg: #0a0e1a;
  --ig-fg: #f7f7f0;
}

[data-solstice] .hex-frame.today {
  animation-duration: 4s; /* slowed pulse from default 2.4s */
}
```

The `data-solstice` attribute is set on `<html>` by the default layout when `useSolstice().active` is true. CSS rules cascade naturally — no per-component changes needed beyond replacing inline polygon strings with the new vars.

### Build pipeline

```
manifest.json
        │
        ▼
nuxt generate ──► .output/public/{html,assets}
        │
        ▼ postbuild hook (Nitro hook in nuxt.config.ts)
        │
        ├── build-og-images.ts  ──► .output/public/og/<sha>.png
        ├── build-feed.ts       ──► .output/public/feed.json
        └── build-sitemap.ts    ──► .output/public/sitemap.xml
```

`BUILD_DATE` resolution (used by `useSolstice` and og:image captions where applicable):

1. `process.env.BUILD_DATE` if set (CI override for testing)
2. Else `todayInAuthorTz()` from `utils/longNow.ts`

Injected at generate time via `nuxt.config.ts` → `runtimeConfig.public.buildDate`.

### Scheduled rebuild

`.github/workflows/scheduled-build.yml` — GitHub Actions cron, daily at 06:00 UTC, plus `workflow_dispatch`. Triggers `nuxt generate` and deploy. Required so the site reflects the current solstice window even when no manifest changes that day. Reuses the existing deploy workflow's job steps.

## Per-feature design

### 1. Solstice/equinox global treatment

**Activation window:** Three days centered on each mile-marker (day before, day of, day after) in the author timezone.

**Mile-marker dates:** Computed via NOAA-formula approximation in `utils/solstice.ts`. Returns one of:

- vernal equinox (≈ Mar 19–21)
- summer solstice (≈ Jun 20–22)
- autumnal equinox (≈ Sep 22–24)
- winter solstice (≈ Dec 20–23)

Tested against NOAA published mile-marker dates 2020–2030.

**Visual transform during window:**

- Page background swaps to dark navy `#0a0e1a` (via `[data-solstice]` CSS rule)
- Today-pulse animation slows from 2.4s → 4s
- A small banner under the page header reads, e.g.: `summer solstice · 2026-06-21`
- No fade animation on the banner — static, present throughout window

**Reduced motion:** `[data-solstice] .hex-frame.today { animation-duration: 4s }` is wrapped in the existing `@media (prefers-reduced-motion: reduce)` block (animation: none) so reduced-motion users see no pulse at all.

**Per-entry solstice halo (existing, unchanged):** Sky entries with `solstice: true` continue to render gold ring on grid and lightbox. This was implemented in stage 3.

**Solstice halo in og:image overlay (new in this stage):** When generating an og:image composite (§4) for a sky entry with `solstice: true`, the hex ring color switches from yellow `#F7B808` to gold `--ig-gold`. All other rendering identical.

### 2. JSON feed

**Path:** `/feed.json` (built into `.output/public/feed.json`).

**Specification:** [JSON Feed v1.1](https://jsonfeed.org/version/1.1).

**Contents:** Latest 50 manifest entries (sky + count combined), sorted descending by `date`. Tie-breaker: `type` ascending alphabetical (`count` before `sky`) for deterministic ordering when a sky and count entry share a date.

**Item shape:**

```json
{
  "id": "https://ig.fz.ax/sky/2026/06/21",
  "url": "https://ig.fz.ax/sky/2026/06/21",
  "date_published": "2026-06-21T12:00:00-04:00",
  "title": "sky 2026-06-21",
  "image": "https://cdn.jsdelivr.net/.../sky/2026-06-21.jpg"
}
```

For count entries, title = `the number ${n}`, url = `/count/${n}`. If `whisper` present, include `"content_text": whisper`.

`date_published` time component: noon in author TZ. Date component matches the entry's `date` field.

**Feed envelope:**

```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "ig.fz.ax",
  "home_page_url": "https://ig.fz.ax/",
  "feed_url": "https://ig.fz.ax/feed.json",
  "description": "noticing what was previously invisible",
  "authors": [{ "name": "fz.ax" }],
  "items": [...]
}
```

### 3. Sitemap

**Path:** `/sitemap.xml`.

**Schema:** `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`.

**Routes included:**

- `/` — `lastmod` = max entry date in manifest
- `/sky` — `lastmod` = max sky entry date
- `/count` — `lastmod` = max count entry date
- `/sky/YYYY/MM/DD` per sky entry — `lastmod` = entry date
- `/count/N` per count entry — `lastmod` = entry date
- `/feed.json` — `lastmod` = max entry date

No `<changefreq>` or `<priority>` (Google ignores them).

### 4. og:image system-wide

**Composite design:** 1200×630 PNG. Dark navy background. Photo center-positioned, hex-clipped (pointy-top), inscribed in an 800×800 area. Yellow `#F7B808` hex ring around the photo (3px ring matching site lightbox). Caption rendered as small-caps text below the hex (e.g., `sky 2026-06-21` or `the number 47`).

**Generation:** `scripts/build-og-images.ts` runs after `nuxt generate`. For each manifest entry, computes sha256 of the local photo bytes, checks if `.output/public/og/<sha>.png` exists. If not, calls `composeOgImage` (sharp pipeline). Cache hit = skip.

**Routes referencing og:image:**

| Route | Source |
|------|--------|
| `/sky/Y/M/D` | composite for that entry's photo |
| `/count/N` | composite for that entry's photo |
| `/sky` (root) | composite for latest sky entry; if none, latest any entry; if none, `/og-brand.png` |
| `/count` (root) | composite for latest count entry; if none, latest any entry; if none, `/og-brand.png` |
| `/` (home) | composite for latest entry of any type; if none, `/og-brand.png` |

**Brand fallback:** `public/og-brand.png` — single committed file, ~30KB. Hex glyph + `ig.fz.ax` small-caps over navy bg. Used only when manifest is empty for the relevant section. Created by hand once, not regenerated.

**Permalink switch:** Existing permalink pages currently set `og:image` to the raw jsDelivr photo URL. They switch to `/og/<sha>.png` (relative URL on ig.fz.ax origin).

**Repo size impact:** Zero. PNGs are written to `.output/public/og/`, which is gitignored along with `.output/`.

**Build time:** First cold build with N entries ≈ N × ~80ms (sharp). Subsequent rebuilds skip cached files → near-zero. Parallelized 4-wide.

**Failure handling:** If composing fails for one entry (corrupt photo, missing local file), log warning, fall back to `/og-brand.png` for that entry's meta tag, continue build. Build does not fail on a single composite error.

### 5. Mobile-first refinements

**Audit matrix:**

- Viewports: 320 / 375 / 414 / 768
- Pages: home, /sky (each of 3 toggle views), /count, /sky/Y/M/D, /count/N
- States: lightbox closed, lightbox open

**Method:** Chrome DevTools device emulation. Walk the matrix; file every issue; fix inline.

**Known fixes (from stage 4 polish review):**

- `CountField`: replace media-query break with `--hex-size: clamp(10px, calc(50vmin / 18), 28px)` so the 217-cell field always fits within 90% of viewport. Hex layout (axial coords, centered field) stays unchanged at every viewport.
- `SkyCalendar`: confirm 7-col grid uses `grid-template-columns: repeat(7, minmax(0, 1fr))` so cells don't overflow at 320px.
- Lightbox close/chevron buttons: enlarge tap target from 48×48 → 56×56 on touch viewports via `@media (hover: none)`.
- Sky header view-toggle: confirm wraps cleanly at <360px (the existing responsive stack should cover this; verify).

Additional findings from the audit are filed as plan tasks once the audit is performed.

**Out of scope:** Layout redesign. CountField centered hex grid is the practice itself; it stays at every viewport.

### 6. Accessibility pass

**Concrete fixes:**

- `PhotoLightbox` focus trap. On open, focus moves to `.lightbox-close`. Tab cycles close → chevron-prev → chevron-next → close. Esc still closes. Implemented as ~30-line inline composable; no external focus-trap library.
- `CountField` cells: `aria-label="number ${n}, ${found ? 'found ' + date : 'not yet found'}"`.
- `SkyCalendar` cells: `aria-label="${date}, ${found ? 'has photo' : 'no photo'}"`.
- Color contrast: measure `--ig-fg-faint` against `--ig-bg` in both default and solstice modes. If < 4.5:1 (WCAG AA for body text), darken faint color.
- `prefers-reduced-motion`: gate solstice slow-pulse, all hover transitions on grid cells.

**Automated check:** `@axe-core/playwright` runs against `nuxt preview` instance as part of CI. Exits nonzero on any AA violation.

**Manual check (documented as plan task, not automated):** VoiceOver pass walking home → sky → count → permalinks → lightbox open/close. Note any flow-narration issues; fix inline.

### 7. fz.ax footer link change

Cross-repo task. Operates on the sibling repo at `../fz.ax` (or `../../fz.ax` depending on developer's working tree). Steps in plan:

1. `cd` to fz.ax repo
2. Locate footer component (likely `components/SiteFooter.vue` or `app.vue` footer block)
3. Add a link to `https://ig.fz.ax`, matching the existing footer aesthetic (small-caps, faint color, no underline)
4. Run fz.ax's lint/test/build gates
5. Commit + push in fz.ax repo

No CI dependency between the two repos. The change is an external announcement; the existence of ig.fz.ax does not depend on the link being present.

### 8. DRY refactors

Three mechanical extractions:

- **OG description constant.** Add `OG_FALLBACK_DESCRIPTION = 'noticing what was previously invisible'` to `utils/copy.ts`. Update `pages/sky/[year]/[month]/[day].vue` and `pages/count/[n].vue` to import from `utils/copy.ts`.
- **Permalink nav component.** Create `components/PermalinkNav.vue` with props `prevHref/allHref/allLabel/nextHref`. Replace the inline `<nav>` block in both permalink pages with `<PermalinkNav>` calls. Permalink pages keep their own `prev/next` href computation; the component just renders.
- **Hex polygon CSS vars.** Define `--hex-clip-square` and `--hex-clip-tall` in `assets/main.css`. Update `CountField`, `SkyCalendar`, `SkyWeeksList`, `PhotoLightbox`, `pages/sky/[year]/[month]/[day].vue`, `pages/count/[n].vue` to use `clip-path: var(--hex-clip-square)` (or `-tall` for non-square cells).

Each extraction is a separate task with its own commit.

## Data flow

**Manifest → routes (existing, unchanged):**

```
data/manifest.json → nuxt.config.ts:manifestRoutes() → prerender list → SSR useManifest() → page/component props
```

**Manifest → og:images (new):**

```
data/manifest.json → build-og-images.ts → reads local photo bytes via relPathFromUrl(entry.url) → composeOgImage() → .output/public/og/<sha>.png
```

The sha-keyed filename is needed both at build time (where to write the PNG) and at render time (what URL to put in the og:image meta tag). To make it cheap on the render side, the sha is precomputed and stored on each manifest entry as a new field `ogSha: string`. CLI scripts (`add-sky.ts`, `add-count.ts`) compute it when ingesting a photo. Permalink pages read `entry.ogSha` to construct `/og/${entry.ogSha}.png`.

**Backfill:** `scripts/backfill-og-sha.ts` reads each existing manifest entry, derives the local repo path via `relPathFromUrl(entry.url)` (already exported by `scripts/lib/photo-store.ts`), reads bytes, computes sha256, writes `ogSha` back to the manifest. One-time script; runs once before the schema becomes required.

Schema update for `manifestSchema.ts`:

```ts
// Both SkyEntry and CountEntry gain:
ogSha?: string  // optional during transition, required once backfilled
```

After backfill, the field becomes required: validator (`utils/manifestSchema.ts`) enforces `typeof e.ogSha === 'string'` on both entry types and rejects manifests with missing or non-string `ogSha`.

**Manifest → feed (new):**

```
data/manifest.json → build-feed.ts → sort + slice → .output/public/feed.json
```

**Manifest → sitemap (new):**

```
data/manifest.json → build-sitemap.ts → enumerate routes → .output/public/sitemap.xml
```

## Testing strategy

### Unit tests

- `tests/utils/solstice.test.ts`
  - `mileMarkerForDate` against NOAA published values 2020–2030 for all four mile-markers (40 assertions)
  - `mileMarkerForDate` returns null for non-mile-marker dates (5 sampled assertions)
  - `activeWindow` boundaries: day before, day of, day after each mile-marker → returns window. Day ±2 → returns null.
  - Author TZ correctness: a mile-marker that falls on different UTC dates depending on TZ resolves to the configured author TZ.
- `tests/utils/copy.test.ts` — single export check.
- `tests/scripts/build-feed.test.ts` — fixture manifest (3 sky + 2 count) → expected feed.json (snapshot matched against committed `tests/fixtures/feed.json`). Second case: 60-entry fixture verifies slice to most-recent 50.
- `tests/scripts/build-sitemap.test.ts` — same approach: fixture → expected sitemap.xml snapshot.
- `tests/scripts/og-image.test.ts` — synthesize 100×100 photo, call `composeOgImage`, assert output exists at correct sha path, dimensions = 1200×630, file size > 1KB.
- `tests/composables/useSolstice.test.ts` — mock `runtimeConfig.public.buildDate`, assert `active`/`mile`/`anchor` reflect the date.

### Component tests

- `tests/components/SolsticeBanner.test.ts` — renders mile name + date when active; renders nothing when inactive.
- `tests/components/PermalinkNav.test.ts` — renders prev/next conditionally on prop presence; renders all-link unconditionally.

### Integration / build tests

After `nuxt generate`:

- assert `.output/public/og/` contains ≥ N PNGs where N = manifest entries (plus 1 for brand if any root page falls back)
- each PNG is ≥ 1KB
- `.output/public/feed.json` parses as JSON and validates against JSON Feed v1.1 minimal shape (version, items, items[].id|url|date_published)
- `.output/public/sitemap.xml` parses as XML, contains all expected `<loc>` URLs

These assertions live in `tests/integration/build-output.test.ts`, run after a temp-dir generate.

### Accessibility tests

`@axe-core/playwright` integrated into the existing `pnpm test` flow:

- spawn `nuxt preview` against built `.output/`
- visit each route (home, /sky, /count, /sky/Y/M/D, /count/N)
- run axe-core, fail on AA violations

### Manual checks (plan tasks, not automated)

- VoiceOver pass: documented as a plan task with a checklist of routes to walk; implementer files findings inline and fixes them in the same task.
- Mobile audit at 320/375/414/768: same approach. Findings filed as sub-tasks within the mobile task; fixes inline.

## Failure modes

| Failure | Behavior |
|--------|----------|
| og:image generation fails for one entry | Log warning, fall back to `/og-brand.png` for that entry's meta, continue build |
| `BUILD_DATE` invalid format | Fail build with descriptive error |
| Feed/sitemap generation fails | Fail build (these are required for SEO correctness) |
| Cross-repo fz.ax footer step fails | Out of band, no CI dependency, manual reverification |
| axe-core finds AA violation | Fail CI, block deploy until fixed |
| Scheduled rebuild workflow fails | Site continues serving last successful build; failure visible in GitHub Actions UI for the author to address manually |

## Out of scope

- Layout redesigns (CountField centered hex stays as-is)
- Schema changes beyond `ogSha` field addition
- New external runtime dependencies (sharp is already a project dep used by add-sky/add-count; reused at build for og:image. @axe-core/playwright added as new dev dep for tests only)
- Content management beyond the existing CLI flow

## Open questions

None at this time. All decisions resolved during brainstorming.

## Implementation order (preview)

The implementation plan (created next via writing-plans skill) will sequence tasks roughly:

1. `utils/solstice.ts` + tests
2. `composables/useSolstice.ts` + tests
3. `assets/main.css` hex CSS vars + components migrate to use them (DRY refactor 3)
4. `utils/copy.ts` + permalink pages migrate (DRY refactor 1)
5. `components/PermalinkNav.vue` + permalink pages migrate (DRY refactor 2)
6. `components/SolsticeBanner.vue` + default layout integration
7. `[data-solstice]` CSS + html attribute toggle in layout
8. Manifest schema: add `ogSha?: string`; backfill script; validator update (then schema enforces required)
9. `public/og-brand.png` (committed asset, hand-made)
10. `scripts/lib/og-image.ts` + tests
11. `scripts/build-og-images.ts` + integration with nuxt config postbuild hook
12. Permalink pages switch og:image to `/og/${sha}.png`
13. Root pages (home, /sky, /count) add og:image meta with fallback chain
14. `scripts/build-feed.ts` + tests + integration
15. `scripts/build-sitemap.ts` + tests + integration
16. `tests/integration/build-output.test.ts`
17. Mobile audit task: walk matrix, file findings, fix inline
18. Accessibility task: axe-core integration, lightbox focus trap, aria labels, contrast, VoiceOver pass
19. `.github/workflows/scheduled-build.yml`
20. Cross-repo task: fz.ax footer link to ig.fz.ax

Each task ships with TDD (failing test first), passing implementation, and a discrete commit.
