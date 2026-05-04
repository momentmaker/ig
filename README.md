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
6. Uploads to the appropriate Google Cloud Storage bucket with `Cache-Control: public, max-age=31536000, immutable`.
7. Appends an entry to `data/manifest.json`, sorted on write.
8. **You commit + push manually.** CI rebuilds and redeploys to ig.fz.ax in ~30s.

A pre-commit hook validates `data/manifest.json` against the schema and rejects URLs that don't point at the configured GCS buckets.

## One-time setup (author only)

### Service account

Create a Google Cloud service account with `Storage Object Admin` on both buckets. Save its JSON key at:

```
~/.config/ig-fz-ax/sa.json
```

The CLI reads `GOOGLE_APPLICATION_CREDENTIALS` if set; otherwise falls back to the standard ADC search path.

### Bucket policies

Run once per fork / fresh project:

```
gsutil iam ch allUsers:objectViewer gs://sky-photos
gsutil iam ch allUsers:objectViewer gs://count-photos
gsutil ubla set on gs://sky-photos
gsutil ubla set on gs://count-photos
cat > /tmp/cors.json <<EOF
[{"origin":["https://ig.fz.ax"],"method":["GET"],"responseHeader":["Cache-Control"],"maxAgeSeconds":3600}]
EOF
gsutil cors set /tmp/cors.json gs://sky-photos
gsutil cors set /tmp/cors.json gs://count-photos
```

Object listing remains disabled by default — visitors can fetch known URLs from the manifest but cannot enumerate the bucket.

### Author config (optional)

```
~/.config/ig-fz-ax/config.json
```

```
{
  "timezone": "America/New_York",
  "skyBucket": "sky-photos",
  "countBucket": "count-photos"
}
```

If the file is absent, the CLI uses the defaults above.

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

## Stages

| Stage | Tag | What ships |
|---|---|---|
| 1 | `stage-1-foundations` | Empty deployable Nuxt 3 site at ig.fz.ax |
| 2 | `stage-2-cli-pipeline` | `pnpm add-sky` / `add-count` / `rm-photo` / `verify` |
| 3 | _next_ | `/sky` calendar + color-band toggle + lightbox + permalinks |
| 4 | _next_ | `/count` 217-hex centered field + spiral + permalinks |
| 5 | _next_ | Solstice treatment, JSON feed, sitemap, og:image, accessibility, fz.ax footer link |
