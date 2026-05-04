# ig.fz.ax · Stage 2 — CLI + Image Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm add-sky <photo>` and `pnpm add-count <n> <photo>` work end-to-end: read EXIF date, strip ALL EXIF, convert HEIC → JPEG, resize to ~1mb with sharp, extract dominant color (sky only), upload to the right GCS bucket, append a validated entry to `data/manifest.json`, and create a git commit. Plus `pnpm remove` and `pnpm doctor` round out the CLI surface. The deployed site is **unchanged** by this stage — Stage 3 wires the homepage tiles to the manifest.

**Architecture:** Pure-Node CLI scripts under `scripts/` invoke shared helpers in `scripts/lib/` (image pipeline, GCS uploader, manifest reader/appender). Cross-stage utilities live in `utils/` (`config.ts`, `solstice.ts`, `manifestSchema.ts`) and are imported both by the CLI and — eventually in Stage 3 — by Nuxt composables. Tests use Vitest with mocked filesystem and a fake GCS client; one manual smoke test against the real buckets validates the live pipeline.

**Tech Stack:** Node 22, TypeScript strict, `sharp` (resize + dominant color), `exiftool-vendored` (EXIF read + strip), `heic-convert` (iPhone HEIC → JPEG), `@google-cloud/storage`, `simple-git-hooks` (project-local pre-commit), `tsx` (run TS scripts directly).

**Spec reference:** `docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md` — implements Stage 2 from the spec's "Implementation order (stages)" section. Stages 3 (sky page), 4 (count page), and 5 (polish) are out of scope.

**Pre-flight sanity check.** Before starting, confirm:

- You are in the `photos` repository root: `pwd` → `/Users/rubberduck/GitHub/momentmaker/photos`
- The branch is `master`: `git branch --show-current` → `master`
- Stage 1 is complete and on master: `git tag -l "stage-1-foundations"` returns `stage-1-foundations`
- All Stage 1 gates green: `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm generate` all exit 0
- The two GCS buckets exist: `sky-photos` and `count-photos`
- A service account JSON file at `~/.config/ig-fz-ax/sa.json` with `Storage Object Admin` on those buckets, or be ready to coordinate with the author to provision one before the smoke-test task (Task 14). Tests do NOT need real credentials — they use a mock client.

---

## Task 1: Install Stage 2 dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (auto)

**Why:** All later tasks need `sharp`, `exiftool-vendored`, `heic-convert`, `@google-cloud/storage`, `simple-git-hooks`, `tsx`. Install up front so the rest of the plan can assume they exist.

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
pnpm add sharp exiftool-vendored heic-convert @google-cloud/storage
pnpm add -D simple-git-hooks @types/heic-convert tsx
```

Expected: pnpm prints "Done in Xs", updates `package.json` and `pnpm-lock.yaml`, runs `nuxt prepare` postinstall successfully. The `preinstall` guard from Stage 1 passes because we're using pnpm.

`sharp` install will report a platform-specific binary download — that is normal and required.

- [ ] **Step 2: Verify the new packages resolve via TypeScript**

```bash
pnpm typecheck
```

Expected: PASS, zero errors.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install sharp, exiftool, heic-convert, gcs, simple-git-hooks, tsx"
```

---

## Task 2: Author config helper + refactor `utils/longNow.ts`

**Files:**
- Create: `utils/config.ts`
- Modify: `utils/longNow.ts`
- Test: `tests/utils/config.spec.ts`

**Why:** Spec section "Sky" mandates a single configured author timezone shared by CLI and runtime. Stage 1 hard-coded `AUTHOR_TZ = 'America/New_York'`. Stage 2 introduces a config file at `~/.config/ig-fz-ax/config.json` with shape `{ "timezone": "...", "skyBucket": "...", "countBucket": "..." }`. The runtime falls back to baked defaults; the CLI reads bucket names for upload.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/config.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { loadConfig, DEFAULT_CONFIG, type IgConfig } from '~/utils/config'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function makeTempConfig(contents: object): string {
  const dir = mkdtempSync(join(tmpdir(), 'ig-config-'))
  const path = join(dir, 'config.json')
  writeFileSync(path, JSON.stringify(contents))
  return path
}

describe('loadConfig', () => {
  it('returns the parsed config when the file exists', () => {
    const path = makeTempConfig({
      timezone: 'America/Los_Angeles',
      skyBucket: 'my-sky',
      countBucket: 'my-count',
    })
    const cfg = loadConfig(path)
    expect(cfg.timezone).toBe('America/Los_Angeles')
    expect(cfg.skyBucket).toBe('my-sky')
    expect(cfg.countBucket).toBe('my-count')
    rmSync(path, { force: true })
  })

  it('returns DEFAULT_CONFIG when the file does not exist', () => {
    const cfg = loadConfig('/no/such/file.json')
    expect(cfg).toEqual(DEFAULT_CONFIG)
  })

  it('throws when the file exists but is not valid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ig-config-'))
    const path = join(dir, 'config.json')
    writeFileSync(path, '{not json')
    expect(() => loadConfig(path)).toThrow(/parse/i)
    rmSync(dir, { recursive: true, force: true })
  })

  it('throws when timezone is missing', () => {
    const path = makeTempConfig({ skyBucket: 'a', countBucket: 'b' })
    expect(() => loadConfig(path)).toThrow(/timezone/i)
    rmSync(path, { force: true })
  })

  it('throws when timezone is not a recognized IANA name', () => {
    const path = makeTempConfig({
      timezone: 'Mars/Olympus_Mons',
      skyBucket: 'a',
      countBucket: 'b',
    })
    expect(() => loadConfig(path)).toThrow(/timezone/i)
    rmSync(path, { force: true })
  })

  it('uses default bucket names if both are missing', () => {
    const path = makeTempConfig({ timezone: 'UTC' })
    const cfg = loadConfig(path)
    expect(cfg.skyBucket).toBe(DEFAULT_CONFIG.skyBucket)
    expect(cfg.countBucket).toBe(DEFAULT_CONFIG.countBucket)
    rmSync(path, { force: true })
  })

  it('exposes a typed shape', () => {
    const cfg: IgConfig = DEFAULT_CONFIG
    expect(typeof cfg.timezone).toBe('string')
    expect(typeof cfg.skyBucket).toBe('string')
    expect(typeof cfg.countBucket).toBe('string')
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/utils/config.spec.ts
```

Expected: FAIL with "Cannot find module '~/utils/config'".

- [ ] **Step 3: Implement `utils/config.ts`**

Create:

```typescript
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface IgConfig {
  timezone: string
  skyBucket: string
  countBucket: string
}

export const DEFAULT_CONFIG: IgConfig = {
  timezone: 'America/New_York',
  skyBucket: 'sky-photos',
  countBucket: 'count-photos',
}

export const DEFAULT_CONFIG_PATH = join(homedir(), '.config', 'ig-fz-ax', 'config.json')

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  }
  catch {
    return false
  }
}

export function loadConfig(path: string = DEFAULT_CONFIG_PATH): IgConfig {
  if (!existsSync(path)) {
    return DEFAULT_CONFIG
  }
  const raw = readFileSync(path, 'utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch (err) {
    throw new Error(`failed to parse ${path}: ${(err as Error).message}`)
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`${path} must be a JSON object`)
  }
  const obj = parsed as Record<string, unknown>
  const timezone = typeof obj.timezone === 'string' ? obj.timezone : null
  if (timezone === null) {
    throw new Error(`${path}: missing required field "timezone"`)
  }
  if (!isValidTimezone(timezone)) {
    throw new Error(`${path}: timezone "${timezone}" is not a recognized IANA name`)
  }
  return {
    timezone,
    skyBucket: typeof obj.skyBucket === 'string' ? obj.skyBucket : DEFAULT_CONFIG.skyBucket,
    countBucket: typeof obj.countBucket === 'string' ? obj.countBucket : DEFAULT_CONFIG.countBucket,
  }
}
```

- [ ] **Step 4: Refactor `utils/longNow.ts` to use config**

Replace the entire file with:

```typescript
import { loadConfig } from './config'

export function currentYear(now: Date = new Date()): string {
  const tz = loadConfig().timezone
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
  }).format(now)
}

export const AUTHOR_TZ = loadConfig().timezone
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: all pass. Stage 1's longNow tests still pass — same TZ, same Intl call.

- [ ] **Step 6: Run typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add utils/config.ts utils/longNow.ts tests/utils/config.spec.ts
git commit -m "feat(utils): config loader + longNow uses config-driven timezone"
```

---

## Task 3: Solstice/equinox table

**Files:**
- Create: `utils/solstice.ts`
- Test: `tests/utils/solstice.spec.ts`

**Why:** Spec section "Solstice marking" mandates a deterministic table covering 2024–2050. Stage 2 needs it for the image pipeline; Stages 3 and 5 will reuse it.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/solstice.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isSolstice, solsticeKind, type SolsticeKind } from '~/utils/solstice'

describe('isSolstice', () => {
  it('returns true for known 2026 solstices and equinoxes', () => {
    expect(isSolstice('2026-03-20')).toBe(true)
    expect(isSolstice('2026-06-21')).toBe(true)
    expect(isSolstice('2026-09-23')).toBe(true)
    expect(isSolstice('2026-12-21')).toBe(true)
  })

  it('returns false for ordinary days in 2026', () => {
    expect(isSolstice('2026-01-15')).toBe(false)
    expect(isSolstice('2026-05-03')).toBe(false)
    expect(isSolstice('2026-11-11')).toBe(false)
  })

  it('returns true for known 2024 mile-markers', () => {
    expect(isSolstice('2024-03-20')).toBe(true)
    expect(isSolstice('2024-06-20')).toBe(true)
    expect(isSolstice('2024-09-22')).toBe(true)
    expect(isSolstice('2024-12-21')).toBe(true)
  })

  it('returns true for known 2030 mile-markers', () => {
    expect(isSolstice('2030-03-20')).toBe(true)
    expect(isSolstice('2030-06-21')).toBe(true)
    expect(isSolstice('2030-09-22')).toBe(true)
    expect(isSolstice('2030-12-21')).toBe(true)
  })
})

describe('solsticeKind', () => {
  it('classifies 2026 mile-markers correctly', () => {
    expect(solsticeKind('2026-03-20')).toBe<SolsticeKind>('vernal')
    expect(solsticeKind('2026-06-21')).toBe<SolsticeKind>('summer')
    expect(solsticeKind('2026-09-23')).toBe<SolsticeKind>('autumnal')
    expect(solsticeKind('2026-12-21')).toBe<SolsticeKind>('winter')
  })

  it('returns null for non-mile-marker days', () => {
    expect(solsticeKind('2026-05-03')).toBeNull()
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/utils/solstice.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `utils/solstice.ts`**

Create:

```typescript
export type SolsticeKind = 'vernal' | 'summer' | 'autumnal' | 'winter'

const TABLE: Record<string, SolsticeKind> = {
  '2024-03-20': 'vernal', '2024-06-20': 'summer', '2024-09-22': 'autumnal', '2024-12-21': 'winter',
  '2025-03-20': 'vernal', '2025-06-21': 'summer', '2025-09-22': 'autumnal', '2025-12-21': 'winter',
  '2026-03-20': 'vernal', '2026-06-21': 'summer', '2026-09-23': 'autumnal', '2026-12-21': 'winter',
  '2027-03-20': 'vernal', '2027-06-21': 'summer', '2027-09-23': 'autumnal', '2027-12-22': 'winter',
  '2028-03-20': 'vernal', '2028-06-20': 'summer', '2028-09-22': 'autumnal', '2028-12-21': 'winter',
  '2029-03-20': 'vernal', '2029-06-21': 'summer', '2029-09-22': 'autumnal', '2029-12-21': 'winter',
  '2030-03-20': 'vernal', '2030-06-21': 'summer', '2030-09-22': 'autumnal', '2030-12-21': 'winter',
  '2031-03-20': 'vernal', '2031-06-21': 'summer', '2031-09-23': 'autumnal', '2031-12-22': 'winter',
  '2032-03-20': 'vernal', '2032-06-20': 'summer', '2032-09-22': 'autumnal', '2032-12-21': 'winter',
  '2033-03-20': 'vernal', '2033-06-21': 'summer', '2033-09-22': 'autumnal', '2033-12-21': 'winter',
  '2034-03-20': 'vernal', '2034-06-21': 'summer', '2034-09-22': 'autumnal', '2034-12-21': 'winter',
  '2035-03-20': 'vernal', '2035-06-21': 'summer', '2035-09-23': 'autumnal', '2035-12-22': 'winter',
  '2036-03-20': 'vernal', '2036-06-20': 'summer', '2036-09-22': 'autumnal', '2036-12-21': 'winter',
  '2037-03-20': 'vernal', '2037-06-21': 'summer', '2037-09-22': 'autumnal', '2037-12-21': 'winter',
  '2038-03-20': 'vernal', '2038-06-21': 'summer', '2038-09-22': 'autumnal', '2038-12-21': 'winter',
  '2039-03-20': 'vernal', '2039-06-21': 'summer', '2039-09-23': 'autumnal', '2039-12-22': 'winter',
  '2040-03-20': 'vernal', '2040-06-20': 'summer', '2040-09-22': 'autumnal', '2040-12-21': 'winter',
  '2041-03-20': 'vernal', '2041-06-21': 'summer', '2041-09-22': 'autumnal', '2041-12-21': 'winter',
  '2042-03-20': 'vernal', '2042-06-21': 'summer', '2042-09-22': 'autumnal', '2042-12-21': 'winter',
  '2043-03-20': 'vernal', '2043-06-21': 'summer', '2043-09-23': 'autumnal', '2043-12-22': 'winter',
  '2044-03-19': 'vernal', '2044-06-20': 'summer', '2044-09-22': 'autumnal', '2044-12-21': 'winter',
  '2045-03-20': 'vernal', '2045-06-21': 'summer', '2045-09-22': 'autumnal', '2045-12-21': 'winter',
  '2046-03-20': 'vernal', '2046-06-21': 'summer', '2046-09-22': 'autumnal', '2046-12-21': 'winter',
  '2047-03-20': 'vernal', '2047-06-21': 'summer', '2047-09-23': 'autumnal', '2047-12-22': 'winter',
  '2048-03-19': 'vernal', '2048-06-20': 'summer', '2048-09-22': 'autumnal', '2048-12-21': 'winter',
  '2049-03-20': 'vernal', '2049-06-21': 'summer', '2049-09-22': 'autumnal', '2049-12-21': 'winter',
  '2050-03-20': 'vernal', '2050-06-21': 'summer', '2050-09-22': 'autumnal', '2050-12-21': 'winter',
}

export function isSolstice(dateYYYYMMDD: string): boolean {
  return Object.hasOwn(TABLE, dateYYYYMMDD)
}

export function solsticeKind(dateYYYYMMDD: string): SolsticeKind | null {
  return TABLE[dateYYYYMMDD] ?? null
}
```

- [ ] **Step 4: Run the test**

```bash
pnpm test tests/utils/solstice.spec.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils/solstice.ts tests/utils/solstice.spec.ts
git commit -m "feat(utils): solstice/equinox table 2024-2050 + isSolstice/solsticeKind"
```

---

## Task 4: Manifest schema, validators, initial empty manifest

**Files:**
- Create: `utils/manifestSchema.ts`
- Create: `data/manifest.json`
- Test: `tests/utils/manifestSchema.spec.ts`

**Why:** Spec section "Manifest shape" defines the source-of-truth JSON. The CLI rejects malformed entries before they touch GCS; the empty initial file gives the CLI a target to append to.

- [ ] **Step 1: Write the failing test**

Create `tests/utils/manifestSchema.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  validateManifest,
  validateEntry,
  sortEntries,
  type Manifest,
  type SkyEntry,
  type CountEntry,
} from '~/utils/manifestSchema'

const validSky: SkyEntry = {
  type: 'sky',
  date: '2026-05-03',
  url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
  w: 1600,
  h: 1200,
  color: '#a8c4e6',
  solstice: false,
}

const validCount: CountEntry = {
  type: 'count',
  n: 87,
  date: '2026-05-03',
  url: 'https://storage.googleapis.com/count-photos/087-2026-05-03.jpg',
  w: 1600,
  h: 1200,
}

describe('validateEntry', () => {
  it('accepts a valid sky entry', () => {
    expect(() => validateEntry(validSky)).not.toThrow()
  })

  it('accepts a valid count entry', () => {
    expect(() => validateEntry(validCount)).not.toThrow()
  })

  it('rejects sky entry with malformed date', () => {
    expect(() => validateEntry({ ...validSky, date: '5/3/26' })).toThrow(/date/i)
  })

  it('rejects count entry with n out of range', () => {
    expect(() => validateEntry({ ...validCount, n: 217 })).toThrow(/0-216/)
    expect(() => validateEntry({ ...validCount, n: -1 })).toThrow(/0-216/)
  })

  it('rejects count entry with non-integer n', () => {
    expect(() => validateEntry({ ...validCount, n: 87.5 })).toThrow(/integer/i)
  })

  it('rejects count entry with whisper longer than 240 chars', () => {
    const long = 'x'.repeat(241)
    expect(() => validateEntry({ ...validCount, whisper: long })).toThrow(/240/)
  })

  it('accepts count entry with empty whisper omitted', () => {
    expect(() => validateEntry({ ...validCount })).not.toThrow()
  })

  it('rejects entry with unknown type', () => {
    expect(() => validateEntry({ ...validSky, type: 'rainbow' as 'sky' })).toThrow(/type/i)
  })

  it('rejects sky entry missing dominant color', () => {
    const { color: _, ...rest } = validSky
    expect(() => validateEntry(rest as SkyEntry)).toThrow(/color/i)
  })

  it('rejects sky entry with non-hex color', () => {
    expect(() => validateEntry({ ...validSky, color: 'not-a-hex' })).toThrow(/color/i)
  })

  it('rejects entry with non-https url', () => {
    expect(() => validateEntry({ ...validSky, url: 'http://example.com/x.jpg' })).toThrow(/url/i)
  })
})

describe('validateManifest', () => {
  it('accepts an empty manifest', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [] }
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('accepts a manifest with one of each type', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [validSky, validCount] }
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('rejects a manifest with wrong version', () => {
    const m = { version: 2, license: 'CC0-1.0', entries: [] } as unknown as Manifest
    expect(() => validateManifest(m)).toThrow(/version/i)
  })

  it('rejects a manifest with duplicate sky dates', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [validSky, validSky] }
    expect(() => validateManifest(m)).toThrow(/duplicate sky/i)
  })

  it('rejects a manifest with duplicate count numbers', () => {
    const m: Manifest = { version: 1, license: 'CC0-1.0', entries: [validCount, validCount] }
    expect(() => validateManifest(m)).toThrow(/duplicate count/i)
  })
})

describe('sortEntries', () => {
  it('sorts count entries before sky entries (alphabetical type)', () => {
    const result = sortEntries([validSky, validCount])
    expect(result[0]?.type).toBe('count')
    expect(result[1]?.type).toBe('sky')
  })

  it('sorts count entries by n ascending', () => {
    const c1: CountEntry = { ...validCount, n: 5 }
    const c2: CountEntry = { ...validCount, n: 100 }
    const c3: CountEntry = { ...validCount, n: 42 }
    const result = sortEntries([c1, c2, c3])
    expect(result.map(e => (e as CountEntry).n)).toEqual([5, 42, 100])
  })

  it('sorts sky entries by date ascending', () => {
    const s1: SkyEntry = { ...validSky, date: '2026-01-15' }
    const s2: SkyEntry = { ...validSky, date: '2026-12-31' }
    const s3: SkyEntry = { ...validSky, date: '2026-06-01' }
    const result = sortEntries([s1, s2, s3])
    expect(result.map(e => (e as SkyEntry).date)).toEqual(['2026-01-15', '2026-06-01', '2026-12-31'])
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/utils/manifestSchema.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `utils/manifestSchema.ts`**

Create:

```typescript
export interface SkyEntry {
  type: 'sky'
  date: string
  url: string
  w: number
  h: number
  color: string
  solstice: boolean
}

export interface CountEntry {
  type: 'count'
  n: number
  date: string
  url: string
  w: number
  h: number
  whisper?: string
}

export type Entry = SkyEntry | CountEntry

export interface Manifest {
  version: 1
  license: 'CC0-1.0'
  entries: Entry[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function validateEntry(entry: Entry): void {
  if (entry.type !== 'sky' && entry.type !== 'count') {
    throw new Error(`entry.type must be 'sky' or 'count', got ${JSON.stringify((entry as { type: unknown }).type)}`)
  }
  if (typeof entry.date !== 'string' || !DATE_RE.test(entry.date)) {
    throw new Error(`entry.date must be YYYY-MM-DD, got ${JSON.stringify(entry.date)}`)
  }
  if (typeof entry.url !== 'string' || !entry.url.startsWith('https://')) {
    throw new Error(`entry.url must start with https://, got ${JSON.stringify(entry.url)}`)
  }
  if (typeof entry.w !== 'number' || entry.w <= 0) {
    throw new Error(`entry.w must be a positive number, got ${JSON.stringify(entry.w)}`)
  }
  if (typeof entry.h !== 'number' || entry.h <= 0) {
    throw new Error(`entry.h must be a positive number, got ${JSON.stringify(entry.h)}`)
  }
  if (entry.type === 'sky') {
    if (typeof entry.color !== 'string' || !HEX_COLOR_RE.test(entry.color)) {
      throw new Error(`sky.color must be #rrggbb, got ${JSON.stringify(entry.color)}`)
    }
    if (typeof entry.solstice !== 'boolean') {
      throw new Error(`sky.solstice must be boolean, got ${JSON.stringify(entry.solstice)}`)
    }
  }
  if (entry.type === 'count') {
    if (!Number.isInteger(entry.n)) {
      throw new Error(`count.n must be an integer, got ${JSON.stringify(entry.n)}`)
    }
    if (entry.n < 0 || entry.n > 216) {
      throw new Error(`count.n must be 0-216, got ${entry.n}`)
    }
    if (entry.whisper !== undefined) {
      if (typeof entry.whisper !== 'string') {
        throw new Error(`count.whisper must be string when present`)
      }
      if (entry.whisper.length > 240) {
        throw new Error(`count.whisper must be ≤ 240 chars, got ${entry.whisper.length}`)
      }
    }
  }
}

export function validateManifest(m: Manifest): void {
  if (m.version !== 1) {
    throw new Error(`manifest.version must be 1, got ${JSON.stringify(m.version)}`)
  }
  if (m.license !== 'CC0-1.0') {
    throw new Error(`manifest.license must be 'CC0-1.0', got ${JSON.stringify(m.license)}`)
  }
  if (!Array.isArray(m.entries)) {
    throw new Error(`manifest.entries must be an array`)
  }
  const skyDates = new Set<string>()
  const countNs = new Set<number>()
  for (const entry of m.entries) {
    validateEntry(entry)
    if (entry.type === 'sky') {
      if (skyDates.has(entry.date)) {
        throw new Error(`duplicate sky entry for date ${entry.date}`)
      }
      skyDates.add(entry.date)
    }
    if (entry.type === 'count') {
      if (countNs.has(entry.n)) {
        throw new Error(`duplicate count entry for n=${entry.n}`)
      }
      countNs.add(entry.n)
    }
  }
}

export function sortEntries(entries: Entry[]): Entry[] {
  const copy = [...entries]
  copy.sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1
    if (a.type === 'count' && b.type === 'count') return a.n - b.n
    if (a.type === 'sky' && b.type === 'sky') return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    return 0
  })
  return copy
}
```

- [ ] **Step 4: Create the initial empty manifest**

Create `data/manifest.json`:

```json
{
  "version": 1,
  "license": "CC0-1.0",
  "entries": []
}
```

- [ ] **Step 5: Run all tests**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add utils/manifestSchema.ts tests/utils/manifestSchema.spec.ts data/manifest.json
git commit -m "feat(utils): manifest schema + validators + initial empty manifest"
```

---

## Task 5: Manifest reader / appender

**Files:**
- Create: `scripts/lib/manifest.ts`
- Test: `tests/scripts/lib/manifest.spec.ts`

**Why:** The CLI needs a typed read-modify-write helper for `data/manifest.json` that validates on load and on save, sorts entries on write, and writes pretty JSON with a trailing newline.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/lib/manifest.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadManifest, saveManifest, appendEntry } from '~/scripts/lib/manifest'
import type { Manifest, SkyEntry, CountEntry } from '~/utils/manifestSchema'

function tempManifest(initial: Manifest): string {
  const dir = mkdtempSync(join(tmpdir(), 'ig-mf-'))
  const path = join(dir, 'manifest.json')
  writeFileSync(path, JSON.stringify(initial))
  return path
}

const sky: SkyEntry = {
  type: 'sky',
  date: '2026-05-03',
  url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
  w: 1600,
  h: 1200,
  color: '#a8c4e6',
  solstice: false,
}

const count: CountEntry = {
  type: 'count',
  n: 87,
  date: '2026-05-04',
  url: 'https://storage.googleapis.com/count-photos/087-2026-05-04.jpg',
  w: 1600,
  h: 1200,
}

describe('loadManifest', () => {
  it('loads and validates a well-formed manifest', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    const m = loadManifest(path)
    expect(m.entries).toEqual([])
    rmSync(path, { force: true })
  })

  it('throws on invalid JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ig-mf-'))
    const path = join(dir, 'manifest.json')
    writeFileSync(path, '{not json')
    expect(() => loadManifest(path)).toThrow()
    rmSync(dir, { recursive: true, force: true })
  })

  it('throws on schema violations', () => {
    const path = tempManifest({ version: 99, license: 'CC0-1.0', entries: [] } as unknown as Manifest)
    expect(() => loadManifest(path)).toThrow(/version/)
    rmSync(path, { force: true })
  })
})

describe('saveManifest', () => {
  it('writes pretty-printed JSON with a trailing newline', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    saveManifest(path, { version: 1, license: 'CC0-1.0', entries: [sky] })
    const text = readFileSync(path, 'utf8')
    expect(text.endsWith('\n')).toBe(true)
    expect(text).toContain('"version": 1')
    rmSync(path, { force: true })
  })

  it('rejects invalid manifests at save time', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    expect(() => saveManifest(path, {
      version: 1,
      license: 'CC0-1.0',
      entries: [sky, sky],
    })).toThrow(/duplicate/)
    rmSync(path, { force: true })
  })

  it('sorts entries on write (count before sky, then by id)', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    saveManifest(path, { version: 1, license: 'CC0-1.0', entries: [sky, count] })
    const m = loadManifest(path)
    expect(m.entries[0]?.type).toBe('count')
    expect(m.entries[1]?.type).toBe('sky')
    rmSync(path, { force: true })
  })
})

describe('appendEntry', () => {
  it('appends a sky entry to an empty manifest', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    appendEntry(path, sky)
    expect(loadManifest(path).entries).toHaveLength(1)
    rmSync(path, { force: true })
  })

  it('rejects appending a duplicate sky date', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [sky] })
    expect(() => appendEntry(path, sky)).toThrow(/duplicate sky/i)
    rmSync(path, { force: true })
  })

  it('rejects appending a duplicate count number', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [count] })
    expect(() => appendEntry(path, count)).toThrow(/duplicate count/i)
    rmSync(path, { force: true })
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/scripts/lib/manifest.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `scripts/lib/manifest.ts`**

Create:

```typescript
import { readFileSync, writeFileSync } from 'node:fs'
import { sortEntries, validateManifest, type Entry, type Manifest } from '../../utils/manifestSchema'

export const MANIFEST_INDENT = 2

export function loadManifest(path: string): Manifest {
  const raw = readFileSync(path, 'utf8')
  let parsed: Manifest
  try {
    parsed = JSON.parse(raw) as Manifest
  }
  catch (err) {
    throw new Error(`failed to parse ${path}: ${(err as Error).message}`)
  }
  validateManifest(parsed)
  return parsed
}

export function saveManifest(path: string, manifest: Manifest): void {
  const sorted: Manifest = {
    ...manifest,
    entries: sortEntries(manifest.entries),
  }
  validateManifest(sorted)
  const text = JSON.stringify(sorted, null, MANIFEST_INDENT) + '\n'
  writeFileSync(path, text, 'utf8')
}

export function appendEntry(path: string, entry: Entry): Manifest {
  const m = loadManifest(path)
  m.entries.push(entry)
  saveManifest(path, m)
  return loadManifest(path)
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/scripts/lib/manifest.spec.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/manifest.ts tests/scripts/lib/manifest.spec.ts
git commit -m "feat(cli): manifest load/save/append helpers with validation"
```

---

## Task 6: Image pipeline (HEIC → JPEG, EXIF strip, resize, dominant color)

**Files:**
- Create: `scripts/lib/pipeline.ts`
- Test: `tests/scripts/lib/pipeline.spec.ts`
- Test fixture: `tests/fixtures/sample.jpg`

**Why:** Spec section "Pipeline (per photo)" lists 11 steps. This task implements steps 1, 3, 4, 5, 6 of the pipeline as `processPhoto(input): Promise<ProcessedPhoto>` returning `{ buffer, width, height, dominantColor, originalDate }`. Solstice tagging, validation, GCS upload, manifest append, commit, push happen in the per-CLI scripts.

- [ ] **Step 1: Generate the fixture JPEG**

```bash
mkdir -p tests/fixtures
node --input-type=module -e "
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
const buf = await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 60, g: 100, b: 200 } } })
  .jpeg({ quality: 90 })
  .withMetadata({ exif: { IFD0: { Make: 'TestCam', Model: 'Mock-1' } } })
  .toBuffer()
writeFileSync('tests/fixtures/sample.jpg', buf)
console.log('wrote', buf.length, 'bytes')
"
```

Expected: prints `wrote N bytes`. Fixture is committed.

- [ ] **Step 2: Write the failing test**

Create `tests/scripts/lib/pipeline.spec.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { processPhoto } from '~/scripts/lib/pipeline'
import { exiftool } from 'exiftool-vendored'

afterAll(async () => {
  await exiftool.end()
})

const fixturePath = 'tests/fixtures/sample.jpg'

describe('processPhoto', () => {
  it('returns a JPEG buffer with sane dimensions', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    expect(Buffer.isBuffer(result.buffer)).toBe(true)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    expect(result.width).toBeLessThanOrEqual(1600)
    expect(result.height).toBeLessThanOrEqual(1600)
  })

  it('strips ALL EXIF tags from the output buffer', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    const tags = await exiftool.read(result.buffer)
    expect((tags as Record<string, unknown>).Make).toBeUndefined()
    expect((tags as Record<string, unknown>).Model).toBeUndefined()
  }, 15_000)

  it('returns a dominant color hex string', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    expect(result.dominantColor).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('output buffer is roughly ≤ 1.2 MB for a small input', async () => {
    const input = readFileSync(fixturePath)
    const result = await processPhoto(input)
    expect(result.buffer.byteLength).toBeLessThanOrEqual(1_200_000)
  })
})
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm test tests/scripts/lib/pipeline.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 4: Implement `scripts/lib/pipeline.ts`**

Create:

```typescript
import sharp from 'sharp'
import { exiftool } from 'exiftool-vendored'
import heicConvert from 'heic-convert'
import { readFileSync } from 'node:fs'

export interface ProcessedPhoto {
  buffer: Buffer
  width: number
  height: number
  dominantColor: string
  originalDate: string | null
}

const MAX_EDGE = 1600
const TARGET_BYTES = 1_000_000
const MAX_BYTES = 1_200_000

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

async function readOriginalDate(buf: Buffer): Promise<string | null> {
  const tags = await exiftool.read(buf) as Record<string, unknown>
  const val = tags.DateTimeOriginal ?? tags.CreateDate ?? null
  if (val === null) return null
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    const d = (val as { toDate: () => Date }).toDate()
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }
  if (typeof val === 'string') {
    const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(val)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  return null
}

async function maybeConvertHeic(buf: Buffer): Promise<Buffer> {
  try {
    await sharp(buf).metadata()
    return buf
  }
  catch {
    const out = await heicConvert({ buffer: buf as unknown as ArrayBufferLike, format: 'JPEG', quality: 0.9 })
    return Buffer.from(out)
  }
}

async function resizeToTarget(buf: Buffer): Promise<Buffer> {
  let last: Buffer | null = null
  for (const quality of [80, 70, 60]) {
    const out = await sharp(buf)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
    last = out
    if (out.byteLength <= TARGET_BYTES) return out
  }
  if (last === null) throw new Error('unreachable')
  return last
}

async function dominantColorOf(buf: Buffer): Promise<string> {
  const stats = await sharp(buf).stats()
  const c = stats.dominant
  return rgbToHex(c.r, c.g, c.b)
}

async function dimensionsOf(buf: Buffer): Promise<{ width: number, height: number }> {
  const md = await sharp(buf).metadata()
  return { width: md.width ?? 0, height: md.height ?? 0 }
}

export async function processPhoto(input: Buffer | string): Promise<ProcessedPhoto> {
  const inputBuf = typeof input === 'string' ? readFileSync(input) : input
  const originalDate = await readOriginalDate(inputBuf)
  const jpegInput = await maybeConvertHeic(inputBuf)
  const resized = await resizeToTarget(jpegInput)
  if (resized.byteLength > MAX_BYTES) {
    throw new Error(`output exceeds max bytes after retries: ${resized.byteLength} > ${MAX_BYTES}`)
  }
  const { width, height } = await dimensionsOf(resized)
  const dominantColor = await dominantColorOf(resized)
  return { buffer: resized, width, height, dominantColor, originalDate }
}
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test tests/scripts/lib/pipeline.spec.ts
```

Expected: 4 tests pass. The EXIF-strip test takes the longest because exiftool spawns a Perl subprocess.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/pipeline.ts tests/scripts/lib/pipeline.spec.ts tests/fixtures/sample.jpg
git commit -m "feat(cli): processPhoto pipeline — HEIC, EXIF strip, resize, dominant color"
```

---

## Task 7: GCS uploader (with mock)

**Files:**
- Create: `scripts/lib/gcs.ts`
- Test: `tests/scripts/lib/gcs.spec.ts`

**Why:** Spec section "Bucket policies" sets `Cache-Control: public, max-age=31536000, immutable`. The CLI must upload with that header set. Tests use a mock client; real GCS roundtrip is exercised in Task 14.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/lib/gcs.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { uploadObject, type MinimalStorage } from '~/scripts/lib/gcs'

describe('uploadObject', () => {
  it('writes the object to the named bucket with immutable cache-control', async () => {
    const save = vi.fn().mockResolvedValue([])
    const file = vi.fn().mockReturnValue({ save })
    const bucket = vi.fn().mockReturnValue({ file })
    const fakeStorage: MinimalStorage = { bucket }
    const buf = Buffer.from('hello')
    const url = await uploadObject('sky-photos', 'sky/2026-05-03.jpg', buf, fakeStorage)
    expect(bucket).toHaveBeenCalledWith('sky-photos')
    expect(file).toHaveBeenCalledWith('sky/2026-05-03.jpg')
    expect(save).toHaveBeenCalledWith(buf, expect.objectContaining({
      contentType: 'image/jpeg',
      metadata: expect.objectContaining({
        cacheControl: 'public, max-age=31536000, immutable',
      }),
    }))
    expect(url).toBe('https://storage.googleapis.com/sky-photos/sky/2026-05-03.jpg')
  })

  it('rejects when the bucket name is empty', async () => {
    await expect(uploadObject('', 'foo.jpg', Buffer.from('x'))).rejects.toThrow(/bucket/i)
  })

  it('rejects when the object name is empty', async () => {
    await expect(uploadObject('sky-photos', '', Buffer.from('x'))).rejects.toThrow(/object/i)
  })
})
```

- [ ] **Step 2: Run, expect failure**

```bash
pnpm test tests/scripts/lib/gcs.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 3: Implement `scripts/lib/gcs.ts`**

Create:

```typescript
import { Storage } from '@google-cloud/storage'

export interface MinimalStorage {
  bucket: (name: string) => {
    file: (name: string) => {
      save: (data: Buffer, opts: object) => Promise<unknown>
    }
  }
}

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

export async function uploadObject(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  storage: MinimalStorage = new Storage(),
): Promise<string> {
  if (!bucketName) throw new Error('bucket name required')
  if (!objectName) throw new Error('object name required')
  await storage.bucket(bucketName).file(objectName).save(buffer, {
    contentType: 'image/jpeg',
    metadata: {
      cacheControl: CACHE_CONTROL,
    },
    resumable: false,
  })
  return `https://storage.googleapis.com/${bucketName}/${objectName}`
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm test tests/scripts/lib/gcs.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/gcs.ts tests/scripts/lib/gcs.spec.ts
git commit -m "feat(cli): GCS uploader with immutable cache-control"
```

---

## Task 8: `pnpm add-sky` CLI

**Files:**
- Create: `scripts/add-sky.ts`
- Modify: `package.json` (add `add-sky` script)
- Test: `tests/scripts/add-sky.spec.ts`

**Why:** First user-facing CLI. Glues `processPhoto` + `uploadObject` + `appendEntry`. Validates against the spec's "Sky" rules: one photo per author-tz date, no replace.

- [ ] **Step 1: Add the script to `package.json`**

In `scripts` block (alphabetical position):

```json
    "add-sky": "tsx scripts/add-sky.ts",
```

- [ ] **Step 2: Write the failing test**

Create `tests/scripts/add-sky.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAddSky } from '~/scripts/add-sky'
import type { Manifest } from '~/utils/manifestSchema'

function tempRepo(): { dir: string, manifestPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ig-cli-'))
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify({ version: 1, license: 'CC0-1.0', entries: [] }))
  return { dir, manifestPath }
}

const FIXTURE = 'tests/fixtures/sample.jpg'

describe('runAddSky', () => {
  it('appends a sky entry and uploads to the configured bucket', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    const save = vi.fn().mockResolvedValue([])
    const file = vi.fn().mockReturnValue({ save })
    const bucket = vi.fn().mockReturnValue({ file })
    const fakeStorage = { bucket }

    await runAddSky({
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })

    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    expect(m.entries).toHaveLength(1)
    const e = m.entries[0]
    expect(e?.type).toBe('sky')
    if (e?.type === 'sky') {
      expect(e.date).toBe('2026-05-03')
      expect(e.url).toBe('https://storage.googleapis.com/sky-photos/2026-05-03.jpg')
      expect(e.color).toMatch(/^#[0-9a-f]{6}$/)
      expect(e.solstice).toBe(false)
    }
    expect(bucket).toHaveBeenCalledWith('sky-photos')
    expect(file).toHaveBeenCalledWith('2026-05-03.jpg')
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)

  it('rejects a duplicate sky date', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'sky',
        date: '2026-05-03',
        url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
        w: 100, h: 100, color: '#aabbcc', solstice: false,
      }],
    }))

    const save = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: () => ({ file: () => ({ save }) }) }

    await expect(runAddSky({
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/duplicate sky/i)
    expect(save).not.toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)

  it('marks solstice photos with solstice: true', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    const save = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: () => ({ file: () => ({ save }) }) }

    await runAddSky({
      photoPath,
      date: '2026-12-21',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })

    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    const e = m.entries[0]
    if (e?.type === 'sky') {
      expect(e.solstice).toBe(true)
    }
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)
})
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm test tests/scripts/add-sky.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 4: Implement `scripts/add-sky.ts`**

Create:

```typescript
#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { processPhoto } from './lib/pipeline'
import { uploadObject, type MinimalStorage } from './lib/gcs'
import { loadManifest, saveManifest } from './lib/manifest'
import { isSolstice } from '../utils/solstice'
import { loadConfig, type IgConfig } from '../utils/config'
import type { SkyEntry, Manifest } from '../utils/manifestSchema'
import { Storage } from '@google-cloud/storage'

export interface AddSkyOptions {
  photoPath: string
  date?: string
  push?: boolean
  manifestPath?: string
  storage?: MinimalStorage
  config?: IgConfig
}

function resolveDate(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function runAddSky(opts: AddSkyOptions): Promise<SkyEntry> {
  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const storage = opts.storage ?? (new Storage() as unknown as MinimalStorage)

  const photo = readFileSync(opts.photoPath)
  const processed = await processPhoto(photo)

  const date = opts.date ?? processed.originalDate ?? resolveDate(new Date(), config.timezone)
  if (!DATE_RE.test(date)) {
    throw new Error(`invalid date "${date}", expected YYYY-MM-DD`)
  }

  const manifest = loadManifest(manifestPath)
  if (manifest.entries.some(e => e.type === 'sky' && e.date === date)) {
    throw new Error(`duplicate sky entry for date ${date}`)
  }

  const objectName = `${date}.jpg`
  const url = await uploadObject(config.skyBucket, objectName, processed.buffer, storage)

  const entry: SkyEntry = {
    type: 'sky',
    date,
    url,
    w: processed.width,
    h: processed.height,
    color: processed.dominantColor,
    solstice: isSolstice(date),
  }
  const next: Manifest = { ...manifest, entries: [...manifest.entries, entry] }
  saveManifest(manifestPath, next)
  return entry
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('usage: pnpm add-sky <photo-path> [--date YYYY-MM-DD] [--push]')
    process.exit(1)
  }
  const photoPath = args[0]!
  const dateIdx = args.indexOf('--date')
  const date = dateIdx >= 0 ? args[dateIdx + 1] : undefined
  try {
    const entry = await runAddSky({ photoPath, date })
    console.log(`✓ sky added for ${entry.date}: ${entry.url}`)
  }
  catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('add-sky.ts') || process.argv[1]?.endsWith('add-sky.js')) {
  await main()
}
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test tests/scripts/add-sky.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/add-sky.ts tests/scripts/add-sky.spec.ts package.json pnpm-lock.yaml
git commit -m "feat(cli): pnpm add-sky — append sky entry, upload to bucket, solstice tag"
```

---

## Task 9: `pnpm add-count` CLI

**Files:**
- Create: `scripts/add-count.ts`
- Modify: `package.json`
- Test: `tests/scripts/add-count.spec.ts`

**Why:** Mirror of `add-sky` but for count. Number 0–216 instead of date as primary identifier, optional one-sentence whisper, no solstice marking, no dominant color.

- [ ] **Step 1: Add the script to `package.json`**

```json
    "add-count": "tsx scripts/add-count.ts",
```

- [ ] **Step 2: Write the failing test**

Create `tests/scripts/add-count.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runAddCount } from '~/scripts/add-count'
import type { Manifest } from '~/utils/manifestSchema'

function tempRepo(): { dir: string, manifestPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ig-count-'))
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify({ version: 1, license: 'CC0-1.0', entries: [] }))
  return { dir, manifestPath }
}

const FIXTURE = 'tests/fixtures/sample.jpg'

describe('runAddCount', () => {
  it('appends a count entry and uploads with NNN-zero-padded object name', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)

    const save = vi.fn().mockResolvedValue([])
    const file = vi.fn().mockReturnValue({ save })
    const bucket = vi.fn().mockReturnValue({ file })
    const fakeStorage = { bucket }

    await runAddCount({
      n: 87,
      photoPath,
      date: '2026-05-03',
      whisper: 'parking sign in astoria',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })

    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    expect(m.entries).toHaveLength(1)
    const e = m.entries[0]
    if (e?.type === 'count') {
      expect(e.n).toBe(87)
      expect(e.url).toBe('https://storage.googleapis.com/count-photos/087-2026-05-03.jpg')
      expect(e.whisper).toBe('parking sign in astoria')
    }
    expect(file).toHaveBeenCalledWith('087-2026-05-03.jpg')
    rmSync(dir, { recursive: true, force: true })
  }, 30_000)

  it('rejects out-of-range n', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    const fakeStorage = { bucket: () => ({ file: () => ({ save: vi.fn() }) }) }
    await expect(runAddCount({
      n: 217,
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/0-216/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects whisper longer than 240 chars', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    const fakeStorage = { bucket: () => ({ file: () => ({ save: vi.fn() }) }) }
    await expect(runAddCount({
      n: 5,
      photoPath,
      date: '2026-05-03',
      whisper: 'x'.repeat(241),
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/240/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('rejects duplicate n', async () => {
    const { dir, manifestPath } = tempRepo()
    const photoPath = join(dir, 'in.jpg')
    copyFileSync(FIXTURE, photoPath)
    writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      license: 'CC0-1.0',
      entries: [{
        type: 'count', n: 5, date: '2026-04-01',
        url: 'https://storage.googleapis.com/count-photos/005-2026-04-01.jpg',
        w: 100, h: 100,
      }],
    }))
    const fakeStorage = { bucket: () => ({ file: () => ({ save: vi.fn() }) }) }
    await expect(runAddCount({
      n: 5,
      photoPath,
      date: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'America/New_York', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/duplicate count/i)
    rmSync(dir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm test tests/scripts/add-count.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 4: Implement `scripts/add-count.ts`**

Create:

```typescript
#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { processPhoto } from './lib/pipeline'
import { uploadObject, type MinimalStorage } from './lib/gcs'
import { loadManifest, saveManifest } from './lib/manifest'
import { loadConfig, type IgConfig } from '../utils/config'
import type { CountEntry, Manifest } from '../utils/manifestSchema'
import { Storage } from '@google-cloud/storage'

export interface AddCountOptions {
  n: number
  photoPath: string
  date?: string
  whisper?: string
  push?: boolean
  manifestPath?: string
  storage?: MinimalStorage
  config?: IgConfig
}

function resolveDate(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function runAddCount(opts: AddCountOptions): Promise<CountEntry> {
  if (!Number.isInteger(opts.n) || opts.n < 0 || opts.n > 216) {
    throw new Error(`count.n must be an integer in 0-216, got ${opts.n}`)
  }
  if (opts.whisper !== undefined && opts.whisper.length > 240) {
    throw new Error(`whisper too long: ${opts.whisper.length} > 240`)
  }

  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const storage = opts.storage ?? (new Storage() as unknown as MinimalStorage)

  const photo = readFileSync(opts.photoPath)
  const processed = await processPhoto(photo)

  const date = opts.date ?? processed.originalDate ?? resolveDate(new Date(), config.timezone)
  if (!DATE_RE.test(date)) {
    throw new Error(`invalid date "${date}", expected YYYY-MM-DD`)
  }

  const manifest = loadManifest(manifestPath)
  if (manifest.entries.some(e => e.type === 'count' && e.n === opts.n)) {
    throw new Error(`duplicate count entry for n=${opts.n}`)
  }

  const padded = opts.n.toString().padStart(3, '0')
  const objectName = `${padded}-${date}.jpg`
  const url = await uploadObject(config.countBucket, objectName, processed.buffer, storage)

  const entry: CountEntry = {
    type: 'count',
    n: opts.n,
    date,
    url,
    w: processed.width,
    h: processed.height,
    ...(opts.whisper !== undefined ? { whisper: opts.whisper } : {}),
  }
  const next: Manifest = { ...manifest, entries: [...manifest.entries, entry] }
  saveManifest(manifestPath, next)
  return entry
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('usage: pnpm add-count <number> <photo-path> [--whisper "text"] [--date YYYY-MM-DD] [--push]')
    process.exit(1)
  }
  const n = Number(args[0])
  const photoPath = args[1]!
  const dateIdx = args.indexOf('--date')
  const whisperIdx = args.indexOf('--whisper')
  const date = dateIdx >= 0 ? args[dateIdx + 1] : undefined
  const whisper = whisperIdx >= 0 ? args[whisperIdx + 1] : undefined
  try {
    const entry = await runAddCount({ n, photoPath, date, whisper })
    console.log(`✓ count ${entry.n} added: ${entry.url}`)
  }
  catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('add-count.ts') || process.argv[1]?.endsWith('add-count.js')) {
  await main()
}
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test tests/scripts/add-count.spec.ts
```

Expected: 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/add-count.ts tests/scripts/add-count.spec.ts package.json
git commit -m "feat(cli): pnpm add-count — append count entry, upload, validate range + whisper"
```

---

## Task 10: `pnpm remove` CLI

**Files:**
- Create: `scripts/remove.ts`
- Modify: `package.json`
- Test: `tests/scripts/remove.spec.ts`

**Why:** Spec mandates an explicit deletion ceremony for privacy mistakes. Removes a manifest entry AND deletes the GCS object. No automatic recovery — git history is the only record.

- [ ] **Step 1: Add the script to `package.json`**

```json
    "remove": "tsx scripts/remove.ts",
```

- [ ] **Step 2: Write the failing test**

Create `tests/scripts/remove.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runRemove } from '~/scripts/remove'

function temp(initial: object): { dir: string, manifestPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ig-rm-'))
  const manifestPath = join(dir, 'manifest.json')
  writeFileSync(manifestPath, JSON.stringify(initial))
  return { dir, manifestPath }
}

describe('runRemove', () => {
  it('removes a sky entry by date and deletes the GCS object', async () => {
    const { dir, manifestPath } = temp({
      version: 1, license: 'CC0-1.0',
      entries: [{
        type: 'sky', date: '2026-05-03',
        url: 'https://storage.googleapis.com/sky-photos/2026-05-03.jpg',
        w: 100, h: 100, color: '#aabbcc', solstice: false,
      }],
    })
    const del = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: vi.fn().mockReturnValue({ file: vi.fn().mockReturnValue({ delete: del }) }) }
    await runRemove({
      type: 'sky',
      id: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'UTC', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(m.entries).toEqual([])
    expect(del).toHaveBeenCalled()
    rmSync(dir, { recursive: true, force: true })
  })

  it('removes a count entry by number', async () => {
    const { dir, manifestPath } = temp({
      version: 1, license: 'CC0-1.0',
      entries: [{
        type: 'count', n: 87, date: '2026-05-03',
        url: 'https://storage.googleapis.com/count-photos/087-2026-05-03.jpg',
        w: 100, h: 100,
      }],
    })
    const del = vi.fn().mockResolvedValue([])
    const fakeStorage = { bucket: vi.fn().mockReturnValue({ file: vi.fn().mockReturnValue({ delete: del }) }) }
    await runRemove({
      type: 'count',
      id: '87',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'UTC', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(m.entries).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })

  it('throws when no matching entry exists', async () => {
    const { dir, manifestPath } = temp({ version: 1, license: 'CC0-1.0', entries: [] })
    const fakeStorage = { bucket: () => ({ file: () => ({ delete: vi.fn() }) }) }
    await expect(runRemove({
      type: 'sky',
      id: '2026-05-03',
      manifestPath,
      storage: fakeStorage,
      config: { timezone: 'UTC', skyBucket: 'sky-photos', countBucket: 'count-photos' },
    })).rejects.toThrow(/not found/i)
    rmSync(dir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm test tests/scripts/remove.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 4: Implement `scripts/remove.ts`**

Create:

```typescript
#!/usr/bin/env tsx
import { loadManifest, saveManifest } from './lib/manifest'
import { loadConfig, type IgConfig } from '../utils/config'
import type { Entry, Manifest } from '../utils/manifestSchema'
import { Storage } from '@google-cloud/storage'

interface MinimalStorage {
  bucket: (name: string) => {
    file: (name: string) => {
      delete: () => Promise<unknown>
    }
  }
}

export interface RemoveOptions {
  type: 'sky' | 'count'
  id: string
  manifestPath?: string
  storage?: MinimalStorage
  config?: IgConfig
}

function objectNameFor(entry: Entry): string {
  if (entry.type === 'sky') return `${entry.date}.jpg`
  const padded = entry.n.toString().padStart(3, '0')
  return `${padded}-${entry.date}.jpg`
}

export async function runRemove(opts: RemoveOptions): Promise<Entry> {
  const config = opts.config ?? loadConfig()
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const storage = opts.storage ?? (new Storage() as unknown as MinimalStorage)

  const manifest = loadManifest(manifestPath)
  let target: Entry | undefined
  if (opts.type === 'sky') {
    target = manifest.entries.find(e => e.type === 'sky' && e.date === opts.id)
  }
  else {
    const n = Number(opts.id)
    target = manifest.entries.find(e => e.type === 'count' && e.n === n)
  }
  if (target === undefined) {
    throw new Error(`entry not found: type=${opts.type} id=${opts.id}`)
  }

  const bucket = target.type === 'sky' ? config.skyBucket : config.countBucket
  await storage.bucket(bucket).file(objectNameFor(target)).delete()

  const next: Manifest = {
    ...manifest,
    entries: manifest.entries.filter(e => e !== target),
  }
  saveManifest(manifestPath, next)
  return target
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('usage: pnpm remove <type> <id> [--push]')
    process.exit(1)
  }
  const type = args[0] as 'sky' | 'count'
  if (type !== 'sky' && type !== 'count') {
    console.error(`type must be 'sky' or 'count'`)
    process.exit(1)
  }
  const id = args[1]!
  try {
    const removed = await runRemove({ type, id })
    console.log(`✓ removed ${type} ${id}`)
    void removed
  }
  catch (err) {
    console.error(`✗ ${(err as Error).message}`)
    process.exit(1)
  }
}

if (process.argv[1]?.endsWith('remove.ts') || process.argv[1]?.endsWith('remove.js')) {
  await main()
}
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test tests/scripts/remove.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/remove.ts tests/scripts/remove.spec.ts package.json
git commit -m "feat(cli): pnpm remove — explicit deletion of manifest entry + GCS object"
```

---

## Task 11: `pnpm doctor` CLI

**Files:**
- Create: `scripts/doctor.ts`
- Modify: `package.json`
- Test: `tests/scripts/doctor.spec.ts`

**Why:** Local validation of the manifest. Counts entries, surfaces schema errors. The GCS-orphan check is deferred to Stage 5 (it requires bucket-listing which we keep disabled per spec).

- [ ] **Step 1: Add the script to `package.json`**

```json
    "doctor": "tsx scripts/doctor.ts",
```

- [ ] **Step 2: Write the failing test**

Create `tests/scripts/doctor.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runDoctor } from '~/scripts/doctor'

function tempManifest(content: object): string {
  const dir = mkdtempSync(join(tmpdir(), 'ig-dr-'))
  const path = join(dir, 'manifest.json')
  writeFileSync(path, JSON.stringify(content))
  return path
}

describe('runDoctor', () => {
  it('reports counts for an empty manifest', () => {
    const path = tempManifest({ version: 1, license: 'CC0-1.0', entries: [] })
    const report = runDoctor({ manifestPath: path })
    expect(report.skyCount).toBe(0)
    expect(report.countCount).toBe(0)
    expect(report.errors).toEqual([])
    rmSync(path, { force: true })
  })

  it('reports counts for a populated manifest', () => {
    const path = tempManifest({
      version: 1, license: 'CC0-1.0',
      entries: [
        { type: 'sky', date: '2026-05-03', url: 'https://storage.googleapis.com/sky-photos/x.jpg', w: 100, h: 100, color: '#aabbcc', solstice: false },
        { type: 'sky', date: '2026-05-04', url: 'https://storage.googleapis.com/sky-photos/y.jpg', w: 100, h: 100, color: '#aabbcc', solstice: false },
        { type: 'count', n: 5, date: '2026-04-01', url: 'https://storage.googleapis.com/count-photos/005-x.jpg', w: 100, h: 100 },
      ],
    })
    const report = runDoctor({ manifestPath: path })
    expect(report.skyCount).toBe(2)
    expect(report.countCount).toBe(1)
    expect(report.errors).toEqual([])
    rmSync(path, { force: true })
  })

  it('reports errors for invalid manifest', () => {
    const path = tempManifest({ version: 99, license: 'CC0-1.0', entries: [] })
    const report = runDoctor({ manifestPath: path })
    expect(report.errors.length).toBeGreaterThan(0)
    rmSync(path, { force: true })
  })
})
```

- [ ] **Step 3: Run, expect failure**

```bash
pnpm test tests/scripts/doctor.spec.ts
```

Expected: FAIL on missing module.

- [ ] **Step 4: Implement `scripts/doctor.ts`**

Create:

```typescript
#!/usr/bin/env tsx
import { readFileSync } from 'node:fs'
import { validateManifest, type Manifest } from '../utils/manifestSchema'

export interface DoctorReport {
  skyCount: number
  countCount: number
  errors: string[]
}

export interface DoctorOptions {
  manifestPath?: string
}

export function runDoctor(opts: DoctorOptions = {}): DoctorReport {
  const manifestPath = opts.manifestPath ?? 'data/manifest.json'
  const errors: string[] = []
  let manifest: Manifest = { version: 1, license: 'CC0-1.0', entries: [] }
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
    validateManifest(manifest)
  }
  catch (err) {
    errors.push((err as Error).message)
  }
  return {
    skyCount: manifest.entries.filter(e => e.type === 'sky').length,
    countCount: manifest.entries.filter(e => e.type === 'count').length,
    errors,
  }
}

function main(): void {
  const report = runDoctor()
  console.log(`sky entries:   ${report.skyCount}`)
  console.log(`count entries: ${report.countCount} / 217`)
  if (report.errors.length > 0) {
    console.log('errors:')
    for (const e of report.errors) console.log(`  ✗ ${e}`)
    process.exit(1)
  }
  console.log('manifest valid ✓')
}

if (process.argv[1]?.endsWith('doctor.ts') || process.argv[1]?.endsWith('doctor.js')) {
  main()
}
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test tests/scripts/doctor.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add scripts/doctor.ts tests/scripts/doctor.spec.ts package.json
git commit -m "feat(cli): pnpm doctor — validate manifest + counts"
```

---

## Task 12: Pre-commit hook (manifest validator)

**Files:**
- Modify: `package.json`
- Create: `scripts/precommit.ts`

**Why:** Spec mandates a project-local pre-commit hook validating `data/manifest.json` is valid JSON, schema-compliant, and references only configured buckets. We use `simple-git-hooks` (already installed in Task 1) so the hook is wired via `package.json` and installed by `pnpm install`.

The hook implementation uses `execFileSync` with an argv array (no shell) to avoid command injection from filenames containing shell metacharacters.

- [ ] **Step 1: Add `simple-git-hooks` config to `package.json`**

After the `engines` block, add:

```json
  "simple-git-hooks": {
    "pre-commit": "pnpm exec tsx scripts/precommit.ts"
  }
```

Update the `prepare` script to install the hook:

```json
    "prepare": "simple-git-hooks || true",
```

- [ ] **Step 2: Run `pnpm install` to wire the hook**

```bash
pnpm install
```

Expected: `simple-git-hooks` writes `.git/hooks/pre-commit`. The trailing `|| true` keeps `pnpm install` from failing on platforms where `.git/` does not exist.

Verify:
```bash
cat .git/hooks/pre-commit | head -3
```

- [ ] **Step 3: Create `scripts/precommit.ts`**

Create:

```typescript
#!/usr/bin/env tsx
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { validateManifest, type Manifest } from '../utils/manifestSchema'
import { loadConfig } from '../utils/config'

const MANIFEST_PATH = 'data/manifest.json'

function staged(file: string): boolean {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' })
    return out.split('\n').includes(file)
  }
  catch {
    return false
  }
}

function fail(msg: string): never {
  console.error(`✗ pre-commit: ${msg}`)
  process.exit(1)
}

if (!existsSync(MANIFEST_PATH)) {
  process.exit(0)
}

if (!staged(MANIFEST_PATH)) {
  process.exit(0)
}

let m: Manifest
try {
  m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
}
catch (err) {
  fail(`${MANIFEST_PATH} is not valid JSON: ${(err as Error).message}`)
}

try {
  validateManifest(m)
}
catch (err) {
  fail(`${MANIFEST_PATH} schema violation: ${(err as Error).message}`)
}

const config = loadConfig()
const allowedHosts = [
  `https://storage.googleapis.com/${config.skyBucket}/`,
  `https://storage.googleapis.com/${config.countBucket}/`,
]
for (const entry of m.entries) {
  if (!allowedHosts.some(p => entry.url.startsWith(p))) {
    fail(`${MANIFEST_PATH}: entry url does not point to a configured bucket: ${entry.url}`)
  }
}

console.log(`✓ pre-commit: manifest valid (${m.entries.length} entries)`)
process.exit(0)
```

- [ ] **Step 4: Test the hook manually**

Run:
```bash
pnpm exec tsx scripts/precommit.ts
```

Expected: prints `✓ pre-commit: manifest valid (0 entries)` and exits 0.

Then trigger a failure path: stage a deliberately-broken manifest:

```bash
cp data/manifest.json /tmp/manifest.bak
echo '{"version":99,"license":"CC0-1.0","entries":[]}' > data/manifest.json
git add data/manifest.json
git commit -m "test bad manifest" 2>&1 | tail -3
```

Expected: commit fails with `✗ pre-commit: data/manifest.json schema violation: manifest.version must be 1, got 99`.

Restore:
```bash
cp /tmp/manifest.bak data/manifest.json
git reset HEAD data/manifest.json
```

- [ ] **Step 5: Commit the hook configuration**

```bash
git add package.json scripts/precommit.ts
git commit -m "chore: simple-git-hooks pre-commit — validate manifest JSON + bucket URLs"
```

---

## Task 13: README updates

**Files:**
- Modify: `README.md`

**Why:** Stage 2 introduces a real CLI. The README explains how to add a photo, set up the service account JSON, and bootstrap GCS bucket policies for a contributor or fork.

- [ ] **Step 1: Replace the README**

Open `README.md` and replace the entire content with:

```markdown
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
pnpm add-sky <photo-path> [--date YYYY-MM-DD] [--push]
pnpm add-count <number> <photo-path> [--whisper "text"] [--date YYYY-MM-DD] [--push]
pnpm remove sky <date>
pnpm remove count <number>
pnpm doctor
```

The CLI:
1. Reads the EXIF `DateTimeOriginal` from the original file.
2. Strips ALL EXIF metadata (GPS, device, timestamps).
3. Resizes to ~1 MB JPEG, max 1600 px on the long edge.
4. Extracts the dominant color (sky photos only).
5. Tags solstice/equinox sky photos.
6. Uploads to the appropriate Google Cloud Storage bucket with `Cache-Control: public, max-age=31536000, immutable`.
7. Appends an entry to `data/manifest.json`, sorted on write.
8. **You commit + push manually**, or pass `--push` to push automatically. CI rebuilds and redeploys to ig.fz.ax in ~30s.

## One-time setup (author only)

### Service account

Create a Google Cloud service account with `Storage Object Admin` on both buckets. Save its JSON key at:

```
~/.config/ig-fz-ax/sa.json
```

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
pnpm doctor       # validate manifest + counts
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README — CLI usage + service account + bucket setup"
```

---

## Task 14: Smoke test against real GCS + tag stage-2-cli-pipeline

**Files:** none (manual + tag)

**Why:** Closes the Stage 2 loop. Up to this point everything is mocked. This task runs one real `pnpm add-sky` against the live `sky-photos` bucket, verifies the file lands, the manifest grows, and the deploy stays green.

This task is **manual** and requires the real service-account JSON. If running unattended (subagent), report `BLOCKED` and ask the human to perform Steps 1–4.

- [ ] **Step 1: Confirm the service account is in place**

```bash
ls -l ~/.config/ig-fz-ax/sa.json
```

Expected: a non-zero file. If absent, **STOP** and coordinate with the author.

- [ ] **Step 2: Confirm working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 3: Run the smoke test on a real sky photo**

Pick one real sky photo. Then:

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.config/ig-fz-ax/sa.json \
  pnpm add-sky path/to/photo.jpg --date 2026-05-04
```

Expected: prints `✓ sky added for 2026-05-04: https://storage.googleapis.com/sky-photos/2026-05-04.jpg`. Verify:
- `pnpm doctor` reports `sky entries: 1`.
- `curl -sI https://storage.googleapis.com/sky-photos/2026-05-04.jpg | head -3` returns `HTTP/2 200`.

- [ ] **Step 4: Commit and push**

```bash
git add data/manifest.json
git commit -m "feat(content): first sky photo — 2026-05-04"
git push
```

Watch the workflow:
```bash
gh run watch --repo momentmaker/ig --exit-status
```

Expected: build + deploy GREEN. The site doesn't yet display the photo (Stage 3 wires that), but the manifest is shipped and the photo is in the bucket.

- [ ] **Step 5: Tag the stage**

```bash
git tag -a stage-2-cli-pipeline -m "stage 2 cli pipeline: pnpm add-sky / add-count / remove / doctor"
git push origin stage-2-cli-pipeline
```

---

## Stage 2 Definition of Done

- [ ] `pnpm add-sky <photo>` writes a sky entry, uploads to GCS, marks solstice if applicable
- [ ] `pnpm add-count <n> <photo>` writes a count entry, validates 0-216 + whisper ≤240 chars, uploads with NNN-zero-padded filename
- [ ] `pnpm remove sky <date>` and `pnpm remove count <n>` delete from manifest + GCS
- [ ] `pnpm doctor` validates the manifest and prints counts
- [ ] Pre-commit hook rejects malformed `data/manifest.json` (invalid JSON, schema violations, foreign-bucket URLs)
- [ ] `~/.config/ig-fz-ax/sa.json` is documented but never committed (verified by `.gitignore`)
- [ ] `~/.config/ig-fz-ax/config.json` is honored if present, defaults otherwise
- [ ] One real photo lives in the `sky-photos` GCS bucket and in `data/manifest.json`
- [ ] All tests pass
- [ ] `pnpm typecheck && pnpm lint && pnpm generate` all PASS
- [ ] CI workflow runs successfully on push to master
- [ ] `stage-2-cli-pipeline` tag pushed
- [ ] No site-visible changes (homepage tiles still show `0 days` / `0 / 217` until Stage 3 wires manifest)

After Stage 2 is done, write the Stage 3 plan (sky page — calendar, color band, lightbox, permalinks, solstice halo).
