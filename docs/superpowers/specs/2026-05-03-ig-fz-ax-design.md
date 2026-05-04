---
title: ig.fz.ax · A Public Practice of Noticing
status: draft
date: 2026-05-03
author: brainstorm session
---

# ig.fz.ax · A Public Practice of Noticing

> ⬡⏣⬢ noticing what was previously invisible ⬢⏣⬡

## Vision

`ig.fz.ax` is the public, photographic sibling of [fz.ax](https://fz.ax). Where fz.ax is a private memento mori — one person quietly noticing the shape of their own time — ig.fz.ax is a public artifact of the same person noticing **what was previously invisible** in the world: the sky, repeated daily; numbers, hidden in the urban landscape.

The site launches with two practices and a schema that admits more:

- **Sky** — one photo of the sky per local calendar day. Daily rhythm. Strict one-per-day, no replace, no backfill. Missed days remain as honest gaps.
- **Count** — find the numbers 0 through 216 in the wild, free order, one photograph each. Inspired by George Nelson's slideshow that counted 100 down to 0. The hexagonal hunt: 217 photographs arrange into a centered hexagon of side 9.

The site itself is static, account-less, social-feature-less, and analytics-less. Visitors arrive, see the practices, and leave. Photos are released CC0.

## Soul (non-negotiables)

These are the constraints that protect the practice. They are not negotiable in implementation.

1. **Public artifact, no social.** Photos are viewable by anyone. There are no comments, no likes, no follower counts, no sign-in, no analytics, no tracking, no third-party scripts.
2. **CC0 photos.** All photos are released to the public domain via CC0-1.0. Visitors may reuse them freely without attribution.
3. **Constraint is the feature.** One sky photo per local day. No replace. No backfill. Numbers are exactly 0–216. Whispers (count only) are exactly one short sentence (≤ 240 chars).
4. **Static-only deploy.** The site is built with `nuxt generate` and served from GitHub Pages. No SSR. No serverless. No backend. Not even one function.
5. **Sibling aesthetic to fz.ax.** Yellow `#F7B808` and blue `#0847F7` carry over. The hexagon glyph vocabulary (`⬢ ⏣ ⬡`) carries over. Chrome is quieter than fz.ax; photographs do the talking.
6. **Privacy at upload.** ALL EXIF metadata is stripped before upload — GPS, device, timestamps, every tag. The photo's date survives only via filename and manifest entry. Original dates are read from EXIF before the strip.
7. **Append-only history.** Every photo is one git commit. There is no in-app delete. An explicit `pnpm remove` ceremony exists for irreversible deletion (e.g., privacy mistakes), and is logged in git history.
8. **No DOB, no accounts, no per-visitor personalization.** The same site is served to everyone. The author's practice is on display; visitors are visitors.
9. **Solstice/equinox honored.** On the four mile-marker days, the entire site transforms (dark navy background, slowed pulse, small-caps treatment). Sky photographs taken on those four days receive a permanent gold halo across grid, lightbox, and og:image.

## Audience

A single author, photographing daily, committing photos via a local CLI. Visitors who land via the linked footer of fz.ax, via word-of-mouth, or via search. The site is not optimized for return visits or engagement metrics; it is an artifact, like a printed book that grows over time.

## Repository & domain

- **Local path:** `/Users/rubberduck/GitHub/momentmaker/photos`
- **Remote:** `git@github.com:momentmaker/ig.git`
- **Domain:** `ig.fz.ax` (CNAME → GitHub Pages, DNS via Cloudflare)
- **GCS buckets (already created):** `sky-photos`, `count-photos`
- **Spec directory mirrors fz.ax:** `docs/superpowers/specs/`

## Practices

### Sky

**Capture rule.** A single photograph of the sky per local calendar day. Composition is unconstrained: dawn, noon, dusk, clear, cloudy, urban, rural — all valid. The discipline is the daily noticing, not the artistry.

**Validation.** The CLI rejects a second photo for the same date. There is no replace flag and no backfill flag. Missed days remain blank forever.

**Solstice marking.** When a photo's date is one of the four astronomical mile-marker days (vernal equinox, summer solstice, autumnal equinox, winter solstice), its manifest entry sets `solstice: true`. The site renders a permanent gold halo on that cell across grid, lightbox, and og:image overlay.

**Display — `/sky` calendar.** A 52-week × 7-day calendar grid per year, stacked descending (latest year top). Each cell renders one of:

- has photo → tinted thumbnail in dominant color
- no photo, past → faint `⬡` outline (gap, kept honest)
- no photo, today → pulsing `⏣` glow (mirror of fz.ax current-week breathing)
- no photo, future → empty
- solstice photo → gold halo ring around cell

**Display — color-band toggle.** A single toggle on `/sky` swaps thumbnails for solid dominant-color squares. The year becomes a 365-stripe color barcode. Click a stripe → lightbox.

**Permalink.** `/sky/YYYY/MM/DD` is prerendered for every existing photo. Renders standalone (no underlying grid behind it) with photo, date in small caps, dominant color swatch, prev/next chevrons, footer.

### Count

**Capture rule.** Each integer from 0 through 216 may be photographed once, when found "in the wild" — a real-world physical context (street sign, building number, license plate, receipt, painted curb, etc.). Screenshots, books, generated images, and digital displays are excluded by honor system. Order is free.

**Whisper.** Each count photo may carry an optional one-sentence whisper (≤ 240 chars) — typically the location or the moment. Sky photos do not carry whispers.

**Validation.** The CLI rejects:
- duplicate number
- `n` outside `[0, 216]`
- whisper > 240 chars
- file unreadable / not an image

**Display — `/count` field.** All 217 numbers render as a single centered hexagonal field, side length 9. Layout follows a deterministic center-out spiral by number:

| Ring | Numbers | Cell count |
|---|---|---|
| 0 | 0 | 1 |
| 1 | 1–6 | 6 |
| 2 | 7–18 | 12 |
| 3 | 19–36 | 18 |
| 4 | 37–60 | 24 |
| 5 | 61–90 | 30 |
| 6 | 91–126 | 36 |
| 7 | 127–168 | 42 |
| 8 | 169–216 | 48 |
| **total** | | **217** |

Each hex cell:
- found → photo as background, clipped to hex shape, faint number overlay top-right
- unfound → outlined `⬡` glyph with faint number centered
- hover unfound → tooltip `"not yet found"`
- hover found → tooltip with date and whisper if present

Header shows progress: `23 / 217 found`.

**Spiral algorithm.** Start at center (n=0). For each subsequent ring r (1..8):
1. Step out one cell in a fixed direction (e.g., NE corner of ring)
2. Walk the ring clockwise through `6r` cells
3. Assign sequential numbers as you go

The algorithm is deterministic, has stable test fixtures, and renders identically across browsers.

**Permalink.** `/count/N` is prerendered for every found number. Renders standalone with photo, number (large), date, whisper if present, prev/next chevrons (numerical neighbors that exist).

### Future practices (schema reservation)

The manifest schema reserves `type: "<practice-name>"` for future plug-ins (`shadow`, `silence`, `last-light`, `letters`, etc.). Each future practice gets its own route with its own native shape (a daily ribbon, an alphabet ladder, a sundial ring, etc.). The homepage practice-tile component scales to N tiles.

## Architecture

### Repo layout

```
photos/
├── app.vue
├── pages/
│   ├── index.vue                          # / — practice tiles
│   ├── sky.vue                            # /sky
│   ├── sky/[year]/[month]/[day].vue       # /sky/YYYY/MM/DD permalink
│   ├── count.vue                          # /count
│   └── count/[n].vue                      # /count/N permalink
├── components/
│   ├── PracticeTile.vue
│   ├── SkyCalendar.vue
│   ├── SkyColorBand.vue
│   ├── CountField.vue
│   ├── HexCell.vue
│   ├── PhotoLightbox.vue
│   └── SiteFooter.vue
├── composables/
│   ├── useManifest.ts
│   ├── useSolstice.ts
│   └── usePermalink.ts
├── utils/
│   ├── solstice.ts            # shared by CLI + composable
│   ├── spiral.ts              # center-out hex spiral algorithm
│   └── manifestSchema.ts      # shared validation + types
├── data/
│   └── manifest.json
├── scripts/
│   ├── add-sky.ts
│   ├── add-count.ts
│   ├── remove.ts
│   ├── doctor.ts
│   ├── regen-feed.ts
│   └── lib/
│       ├── pipeline.ts
│       ├── gcs.ts
│       └── manifest.ts
├── nuxt.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── vitest.config.ts
├── public/
│   ├── feed.json     # generated at build
│   ├── robots.txt
│   ├── sitemap.xml   # generated at build
│   └── CNAME         # ig.fz.ax
└── docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md
```

### Manifest shape

```json
{
  "version": 1,
  "license": "CC0-1.0",
  "entries": [
    {
      "type": "sky",
      "date": "2026-05-03",
      "url": "https://storage.googleapis.com/sky-photos/2026-05-03.jpg",
      "w": 1600,
      "h": 1200,
      "color": "#a8c4e6",
      "solstice": false
    },
    {
      "type": "count",
      "n": 87,
      "date": "2026-05-03",
      "url": "https://storage.googleapis.com/count-photos/087-2026-05-03.jpg",
      "w": 1600,
      "h": 1200,
      "whisper": "parking sign in astoria"
    }
  ]
}
```

The manifest is the source of truth. It lives in the repo (one git commit per photo). The site loads it at build time to prerender every route. The CLI appends to it, sorts entries on write, and commits.

**Sort order on write (deterministic, stable diffs).** Entries are sorted by `type` ascending (alphabetical: `count` before `sky`), then within each type by the natural identifier ascending — for `count` that is `n`, for `sky` that is `date`. This produces a small, readable diff per addition (one new line in roughly the right place) rather than a global churn.

### Data flow

```
phone photo → local inbox dir
    ↓ pnpm add-sky photo.jpg
HEIC convert if needed
    ↓
exiftool read DateTimeOriginal → photo date (else --date flag, else today)
    ↓
exiftool strip ALL tags
    ↓
sharp resize to ~1mb (max edge 1600px, JPEG q80, retry q70/q60 if oversize)
    ↓
sharp .stats() dominant color (sky only)
    ↓
solstice check (sky only)
    ↓
GCS upload to sky-photos/ or count-photos/, immutable cache
    ↓
append manifest.json entry, sorted on write
    ↓
git add + commit "<type>: <id>"
    ↓ user pushes (or --push flag)
GitHub Pages rebuilds → live ~30s later
```

### Render strategy

`nuxt generate` walks the manifest at build time and prerenders:

- Index pages: `/`, `/sky`, `/count`
- Per-day sky permalinks: one HTML page per existing sky entry
- Per-number count permalinks: one HTML page per existing count entry
- `feed.json`: last 50 entries chronological desc by `date` (ties broken by `type`), JSON Feed v1.1 spec
- `sitemap.xml`: all routes
- `robots.txt`: allow all
- `og:image` per permalink → photo URL
- `og:title` / `og:description` per permalink

The site requires no JavaScript to view. The lightbox URL sync uses History API as enhancement only; the same component renders at the permalink URL as a full standalone page.

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Nuxt 3, `ssr: false`, `nuxt generate` | mirrors fz.ax |
| Language | TypeScript strict (`noUncheckedIndexedAccess`) | mirrors fz.ax |
| State | Single `useManifest` composable | mirrors fz.ax `useFzState` pattern |
| Image pipeline | `sharp` | resize + dominant-color via `.stats()` |
| EXIF | `exiftool-vendored` | read date, then strip all tags |
| HEIC | `heic-convert` | iPhone reality |
| Upload | `@google-cloud/storage` | direct, official SDK |
| Tests | Vitest + happy-dom | mirrors fz.ax |
| Hosting | GitHub Pages, custom domain | mirrors fz.ax |
| Runtime third-party libs | zero outside Vue/Nuxt core | mirrors fz.ax soul |

## Routes & UI

### Route map

| Route | Render | Purpose |
|---|---|---|
| `/` | static | hexagonal practice tiles |
| `/sky` | static | calendar grid + color-band toggle |
| `/sky/YYYY/MM/DD` | static, one per existing sky | sky permalink |
| `/count` | static | 217-hex centered field |
| `/count/N` | static, one per found number | count permalink |
| `/feed.json` | generated at build | last 50 entries |
| `/robots.txt` | static | allow all |
| `/sitemap.xml` | generated at build | all routes |

### Homepage `/`

Big hexagonal tiles, one per practice. Each tile uses a hex clip-path container (~360px desktop / ~280px mobile) with the practice name in small caps, the count metric (e.g., `47 days`, `23 / 217`), and the latest photo as a tinted backdrop. Hover/tap triggers a soft breathing glow.

Layout adapts to N practices:

| N | Desktop | Mobile |
|---|---|---|
| 2 | side-by-side | stacked |
| 3 | triangle | stacked |
| 4 | diamond | stacked |
| 7 | hex flower (1 + 6) | stacked |

Below tiles: tiny line — `practices · 02026` (Long Now zero in yellow). No nav bar, no header on `/`.

### Lightbox

Modal overlay opens on photo click. URL updates via `history.pushState` to the entry's permalink. ESC, click backdrop, or browser back closes (URL pops back to grid). Direct visit to a permalink renders the same content as a full standalone page (same component, no underlying grid).

Content:
- Photo (max-height 90vh, contained, never cropped)
- Below: date in small caps; dominant color swatch (sky); number (count); whisper (count if present)
- Prev / next chevrons (← →) navigate to the neighboring entry's permalink within the same practice
- Footer same as everywhere

### Site chrome

- **Header:** site mark `ig.fz.ax` left, route name right (small caps). On `/` no header is shown.
- **Footer:** `← fz.ax` link left, `02026 · the long now` (yellow zero) center, `CC0 photos · MIT code` right.
- **No nav bar.** Routes are reached via homepage tiles, direct URL, or lightbox chevrons.

### Mobile-first

- Calendar cells: minimum 44 × 44 tap target on mobile
- Hex tiles: phone width fits one tile per row + padding
- Lightbox: swipe left/right = prev/next entry
- Lightbox: bottom-sheet style on phone (slides up from bottom)

### Accessibility

- All photos have descriptive `alt` text: `"sky on 2026-05-03"`, `"the number 87, found 2026-05-03"` (+ whisper if present)
- Keyboard: `←` / `→` navigate lightbox, `ESC` closes, `Tab` moves through cells
- `prefers-reduced-motion` disables breathing pulses and swipe transitions

### Solstice/equinox treatment

When the current local date is a solstice or equinox, all routes transform:
- Background: dark navy `#0a1438` (matches fz.ax F2.5)
- Hex tile glow: 5.5s slow cycle (vs 2.4s normal)
- Headers: small-caps weight up
- One-line note in footer: `solstice · 21 jun 02026` (or appropriate)

The treatment is active for the entire local calendar day, then reverts.

## CLI & image pipeline

### Commands

```bash
pnpm add-sky <photo-path> [--date YYYY-MM-DD] [--push]
pnpm add-count <number> <photo-path> [--whisper "text"] [--date YYYY-MM-DD] [--push]
pnpm add-sky --dir ./inbox/                        # batch — folder of photos
pnpm remove <type> <id> [--push]                   # explicit deletion ceremony
pnpm doctor                                        # validate manifest, check GCS, report orphans/missing
pnpm regen-feed                                    # rebuild /feed.json from manifest
```

### Pipeline (per photo)

1. Detect format. HEIC → libheif convert to JPEG.
2. exiftool read `DateTimeOriginal` → photo date (else `--date` flag, else today).
3. exiftool strip ALL tags.
4. sharp resize: max edge 1600px, JPEG q80, target ~1mb (retry q70 → q60 if oversize).
5. sharp `.stats()` → dominant color → hex string (sky only).
6. Solstice check — is photo date one of the four mile-marker days? → `solstice: true` (sky only). Dates are computed from a deterministic table covering 2024–2050 (vernal equinox, summer solstice, autumnal equinox, winter solstice), shared between the CLI (`scripts/lib/solstice.ts`) and the runtime composable (`composables/useSolstice.ts`) via a single source module in `utils/solstice.ts`.
7. Validate against manifest (no duplicate date / number, range checks).
8. Upload to GCS:
   - sky → `sky-photos/YYYY-MM-DD.jpg`
   - count → `count-photos/NNN-YYYY-MM-DD.jpg` (3-digit zero-pad)
   - `Cache-Control: public, max-age=31536000, immutable`
9. Append manifest entry, sorted on write.
10. `git add data/manifest.json && git commit -m "<type>: <id>"`.
11. If `--push`: `git push`.

### Auth

- Service account JSON at `~/.config/ig-fz-ax/sa.json` (NOT in repo).
- Path overridable via `IG_SA_PATH` env var.
- `.gitignore` blanket-excludes service account JSONs.
- README documents how to create the service account and bucket policies.

### Bucket policies (one-time, manual, documented in README)

```bash
# Both buckets — public reads
gsutil iam ch allUsers:objectViewer gs://sky-photos
gsutil iam ch allUsers:objectViewer gs://count-photos

# Uniform bucket-level access
gsutil ubla set on gs://sky-photos
gsutil ubla set on gs://count-photos

# CORS
gsutil cors set cors.json gs://sky-photos
gsutil cors set cors.json gs://count-photos
```

`cors.json`:
```json
[{"origin":["https://ig.fz.ax"],"method":["GET"],"responseHeader":["Cache-Control"],"maxAgeSeconds":3600}]
```

Object listing remains disabled (default). Visitors can fetch known URLs from the manifest but cannot enumerate the bucket contents.

### Validation rules

| Practice | Rule | Error |
|---|---|---|
| sky | one entry per local date | `sky entry already exists for <date>` |
| count | `n ∈ [0, 216]` | `count must be 0-216` |
| count | one entry per number | `count <n> already exists (found <date>)` |
| count | whisper ≤ 240 chars | `whisper too long: <N> chars` |
| both | photo file exists + readable | `cannot read <path>` |
| both | image probes valid via sharp | `not a valid image` |

### Pre-commit hook (project-local)

- Verify `data/manifest.json` is valid JSON.
- Verify each entry's URL points to one of the configured buckets (string check, no fetch).
- Block commit if `data/manifest.json` references local file paths.

### Tests (Vitest)

- `pipeline.test.ts` — fixture HEIC + JPEG, verify EXIF gone after pipeline.
- `manifest.test.ts` — validation rules, sort order, schema round-trip.
- `spiral.test.ts` — center-out hex spiral correctness for n=0..216 (golden fixture).
- `solstice.test.ts` — known dates 2024–2030 round-trip.
- `feed.test.ts` — feed generation from manifest.

## Deploy & hosting

### Domain

- `ig.fz.ax` — CNAME → GitHub Pages (`momentmaker.github.io`).
- DNS via Cloudflare (DNS-only, no proxy initially — match fz.ax).
- `public/CNAME` file = `ig.fz.ax`.

### GitHub Actions

`.github/workflows/deploy.yml`:

1. Trigger: push to `master` (manifest or code change).
2. Setup: Node 20, pnpm.
3. `pnpm install --frozen-lockfile`.
4. `pnpm test`.
5. `pnpm typecheck`.
6. `pnpm lint`.
7. `pnpm generate` → `.output/public/`.
8. Deploy to `gh-pages` via `actions/deploy-pages`.

Deploy lands ~30–60s after push. No manual steps after `pnpm add-sky photo.jpg --push`.

### Cost estimate

- **Storage:** 5GB free tier. ~1mb per photo × 365 sky/yr × ~10yr + 217 count = ~3.8GB after a decade. Within free.
- **Egress:** 1GB/mo free, then ~$0.12/GB. If site stays low-traffic, free. If traffic spikes, add Cloudflare proxy in front of bucket later (free egress through CF).
- **GitHub Pages:** free for public repos.

## fz.ax integration

Minimal coupling. Each side gains one footer link to the other:

- `ig.fz.ax` footer: `← fz.ax`.
- `fz.ax` footer: gains `→ ig.fz.ax`.

No runtime cross-fetching, no shared state, no shared service worker. Two static sites that point at each other, no more.

## Implementation order (stages)

Each stage = one tag, one PR, multi-round adversarial review (mirroring the fz.ax process).

1. **Stage 1 — Foundations.** Repo init, Nuxt scaffold, TypeScript config, lint, test, basic homepage tile, deploy pipeline. End-to-end deploy of a placeholder site to `ig.fz.ax`.
2. **Stage 2 — CLI + pipeline.** `pnpm add-sky` and `pnpm add-count` working with EXIF strip, GCS upload, manifest append, commit. Validate against ~5 real sky photos and ~3 real count photos.
3. **Stage 3 — Sky page.** Calendar grid, color-band toggle, dominant color, lightbox, permalinks. Solstice halo logic.
4. **Stage 4 — Count page.** 217-hex centered-hex layout, spiral algorithm, lightbox, permalinks, whisper display.
5. **Stage 5 — Cross-cutting polish.** Solstice/equinox global treatment, JSON feed, sitemap, og:image, mobile-first refinements, accessibility pass, fz.ax footer link change.

Each stage produces a working, deployable site; the site grows in capability without ever being broken.

## Non-goals

Listing these protects the soul:

- No accounts. Ever.
- No comments, likes, follower counts, or any social signal.
- No analytics, telemetry, or tracking.
- No third-party scripts, no CDN fonts, no widgets.
- No AI features. No generated photos. No filters.
- No SSR. No serverless. No backend.
- No sync between fz.ax and ig.fz.ax beyond reciprocal footer links.
- No personalization for visitors. The site is the same for everyone.
- No replace, no backfill, no skip-fill on sky photos.
- No DOB. No "your weeks" view. ig.fz.ax is the author's record, not a per-visitor experience.

## Open questions resolved during brainstorm

| Question | Resolution |
|---|---|
| Manifest source of truth | Repo-side `data/manifest.json`. One git commit per photo. |
| Count range | 0–216 inclusive. 217 = centered hexagonal number for side 9. |
| Count direction | Free order. Number = identity, position determined by center-out spiral. |
| Sky cadence | Strict one-per-day, no replace, no backfill. |
| Sky layout | Calendar grid primary, color-band toggle. |
| Aesthetic | Sibling to fz.ax — inherits palette and hex glyphs, photo-frame chrome. |
| Homepage | Hexagonal practice tiles. |
| Solstice treatment | Full carry to ig.fz.ax + permanent gold halo on solstice sky photos. |
| Whispers | Sky silent. Count optional one-sentence whisper. |
| Lightbox | Modal overlay + URL update + back-button + same component prerendered at permalink. |
| Cross-link to fz.ax | Footer both ways. No runtime coupling. |
| Mobile primacy | Mobile-first. |
| PWA / offline | No. Photos are heavy and online-only viewing matches the artifact intent. |
| JSON feed | Yes — `/feed.json`. |
| Atom/RSS | No. Consumers can convert. |
| Bucket access | Public-read, listing disabled, immutable cache. |
| Empty count hexes | Outline `⬡` + faint number. |
| robots.txt | Allow indexing. |
| og:image | Per permalink, set to the photo URL. |
| Render strategy | Pre-render every route via `nuxt generate`. |
| DOB | Removed entirely. |

---

⎇ written quietly, one photograph at a time
