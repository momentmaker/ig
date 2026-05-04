# ig.fz.ax

> ⬡⏣⬢ noticing what was previously invisible ⬢⏣⬡

Public, photographic sibling of [fz.ax](https://fz.ax). A practice of noticing — daily sky, hunt for numbers 0–216 in the wild — rendered as a quiet static site.

**Live:** [ig.fz.ax](https://ig.fz.ax)

## License

- **Code:** [MIT](LICENSE)
- **Photos:** CC0-1.0 (released to the public domain)

## Spec

See [`docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md`](docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md).

## Status

Stage 2 of 5 — CLI + image pipeline shipped. The `/sky` and `/count` pages, solstice treatment, JSON feed, and homepage tile-from-manifest derivation all ship in later stages.

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
2. Strips ALL EXIF metadata (GPS, device, timestamps).
3. Resizes to ~1 MB JPEG, max 1600 px on the long edge.
4. Extracts the dominant color (sky photos only).
5. Tags solstice/equinox sky photos.
6. Writes the photo to `/photos/<type>/` (committed to git).
7. Appends an entry to `data/manifest.json`, sorted on write. The manifest URL points at jsDelivr's git CDN: `https://cdn.jsdelivr.net/gh/momentmaker/ig@latest/photos/...`.
8. **You commit + push manually.** CI rebuilds and redeploys to ig.fz.ax in ~30s; jsDelivr's `@latest` tag picks up the new commit within ~12h.

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
pnpm dev          # http://localhost:3000
pnpm test         # vitest
pnpm typecheck    # nuxt typecheck
pnpm lint         # eslint
pnpm generate     # static build → .output/public
pnpm verify       # validate manifest + counts
```

## Storage model

- `/photos/sky/<YYYY-MM-DD>.jpg` — sky photos (one per date, append-only)
- `/photos/count/<NNN>-<YYYY-MM-DD>.jpg` — count photos (one per integer 0–216)
- `data/manifest.json` — schema-validated source of truth (one entry per photo)
- jsDelivr serves the photos at the URLs in `manifest.json` with global edge caching
- GitHub Pages serves the rendered Nuxt site (no photos in `.output/public/`)

## Stages

| Stage | Tag | What ships |
|---|---|---|
| 1 | `stage-1-foundations` | Empty deployable Nuxt 3 site at ig.fz.ax |
| 2 | `stage-2-cli-pipeline` | `pnpm add-sky` / `add-count` / `rm-photo` / `verify` |
| 3 | _next_ | `/sky` calendar + color-band toggle + lightbox + permalinks |
| 4 | _next_ | `/count` 217-hex centered field + spiral + permalinks |
| 5 | _next_ | Solstice treatment, JSON feed, sitemap, og:image, accessibility, fz.ax footer link |
