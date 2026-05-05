# ig.fz.ax

> ⬡⏣⬢ noticing what was previously invisible ⬢⏣⬡

Public, photographic sibling of [fz.ax](https://fz.ax). A practice of noticing — daily sky, hunt for numbers 0–216 in the wild — rendered as a quiet static site.

**Live:** [ig.fz.ax](https://ig.fz.ax)

## License

- **Code:** [MIT](LICENSE)
- **Photos:** CC0-1.0 (released to the public domain)

## What ships

- **`/sky`** — daily sky photos in three views: calendar grid, color-band stripes, weeks list. Today's cell pulses; solstice/equinox days carry a permanent gold halo. Click any photo for a hex-framed lightbox with date and photo-local time of day.
- **`/count`** — 217-cell centered-hex field laid out by deterministic spiral coordinates. Each found number occupies its identity-locked position; unfound positions show the number faintly. Whispers (one short sentence) display alongside in the lightbox.
- **`/sky/YYYY/MM/DD`** and **`/count/N`** — prerendered permalinks per entry, with og:image meta pointing at a build-time-composed hex-framed PNG (1200×630, navy bg, yellow ring, photo hex-clipped, caption in small caps).
- **`/feed.json`** — JSON Feed v1.1 of the latest 50 entries, mixed sky + count, sorted desc by date.
- **`/sitemap.xml`** — every prerendered route plus per-entry lastmod.
- **Solstice/equinox treatment** — on the four mile-marker days plus one day on either side, the entire site renders with dark navy background, slowed today-pulse, and a small-caps banner under the page header (`summer solstice · 2026-06-21`). A daily scheduled rebuild keeps the live site in sync with the current window even when no photo is added.
- **Accessibility** — axe-core (wcag2a + wcag2aa) gates every prerendered route in CI. Lightbox traps focus, grid cells carry aria-labels, contrast hits AA in light, dark, and solstice modes, all motion respects `prefers-reduced-motion`.

## Adding a photo (author only)

```
pnpm add-sky <photo-path> [--date YYYY-MM-DD]
pnpm add-count <number> <photo-path> [--whisper "text"] [--date YYYY-MM-DD]
pnpm rm-photo sky <date>
pnpm rm-photo count <number>
pnpm verify
```

`rm-photo` and `verify` avoid pnpm's built-in `remove`/`doctor` commands.

The CLI:
1. Reads the EXIF `DateTimeOriginal` from the original file.
2. For sky photos, captures the photo-local hour:minute (HH:MM) into the manifest.
3. Strips ALL EXIF metadata (GPS, device, timestamps).
4. Resizes to ~1 MB JPEG, max 1600 px on the long edge.
5. Extracts the dominant color (sky photos only).
6. Tags solstice/equinox sky photos.
7. Computes a sha256 of the processed JPEG bytes (`ogSha`) — used as the cache key for the per-entry og:image composite.
8. Writes the photo to `/photos/<type>/` (committed to git).
9. Appends an entry to `data/manifest.json`, sorted on write. The manifest URL points at jsDelivr's git CDN: `https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/...`.
10. **You commit + push manually.** CI rebuilds and redeploys to ig.fz.ax in ~30s; jsDelivr's `@latest` tag picks up the new commit within ~12h.

A pre-commit hook validates `data/manifest.json` against the schema and rejects URLs that don't point at the project's jsDelivr base.

## One-time setup (author only)

No external accounts required. Photos travel with the repo. Optional config:

```
~/.config/ig-fz-ax/config.json
```

```
{
  "timezone": "America/New_York"
}
```

If the file is absent, the CLI uses the default (America/New_York).

## Development

```
pnpm install
pnpm dev               # http://localhost:3000
pnpm test              # vitest (unit + component)
pnpm test:integration  # vitest, runs full pnpm generate + asserts artifacts
pnpm test:axe          # playwright + axe-core against the built site
pnpm typecheck         # nuxt typecheck
pnpm lint              # eslint
pnpm generate          # static build → .output/public, then postbuild
                       # (og-images → feed.json → sitemap.xml)
pnpm verify            # validate manifest + counts
```

## Storage model

- `/photos/sky/<YYYY-MM-DD>.jpg` — sky photos (one per date, append-only)
- `/photos/count/<NNN>-<YYYY-MM-DD>.jpg` — count photos (one per integer 0–216)
- `data/manifest.json` — schema-validated source of truth (one entry per photo)
- jsDelivr serves the photos at the URLs in `manifest.json` with global edge caching
- GitHub Pages serves the rendered Nuxt site (no photos in `.output/public/`)
- `.og-cache/` (gitignored) — sha-keyed PNG composites generated at build time, copied into `.output/public/og/` so they survive nuxt generate's wipe across rebuilds

## Build pipeline

```
manifest.json → nuxt generate → .output/public/{html,assets}
                                        ↓ tsx scripts/postbuild.ts
                                        ├── build-og-images   → .output/public/og/<sha>.png
                                        ├── build-feed        → .output/public/feed.json
                                        └── build-sitemap     → .output/public/sitemap.xml
```

Two GitHub Actions workflows deploy to GitHub Pages: `deploy.yml` on every push to master, and `scheduled-build.yml` daily at 06:00 UTC (so the solstice window can flip without a content change).

## Stages

| Stage | What shipped |
|---|---|
| 1 | Foundations — Nuxt 3 + TypeScript + tests + GitHub Pages deploy |
| 2 | CLI + image pipeline — `add-sky`, `add-count`, `rm-photo`, `verify` |
| 3 | `/sky` page — calendar/color-band/weeks views, lightbox, permalinks, solstice halo |
| 4 | `/count` page — 217-hex centered field, spiral, lightbox, permalinks |
| 5 | Cross-cutting polish — solstice global treatment, JSON feed, sitemap, og:image system, mobile audit, accessibility, scheduled rebuild, fz.ax footer link, sky time-of-day, DRY refactors |

Each stage shipped to master with full test coverage; specs and plans live under `docs/superpowers/`.
