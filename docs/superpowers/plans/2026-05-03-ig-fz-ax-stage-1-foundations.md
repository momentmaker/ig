# ig.fz.ax · Stage 1 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an empty but deployable Nuxt 3 static site at `ig.fz.ax`, with TypeScript strict, ESLint, Vitest, a hexagonal homepage of two placeholder practice tiles (`sky` and `count` with zero counts), the shared site footer, the deploy workflow, and the GitHub Pages CNAME — so that pushing to `master` ships a real placeholder site to the real domain. No CLI, no manifest data, no per-practice routes yet (those are Stages 2–4).

**Architecture:** A thin `app.vue` mounts a single `<NuxtPage/>`. The homepage `pages/index.vue` renders a `<HomeTiles/>` component containing two `<PracticeTile/>` instances ("sky" and "count") arranged in the layout-per-N table from the spec. Site chrome (footer with `← fz.ax` link, Long Now line, license line) lives in `<SiteFooter/>`, included from `app.vue`. Visual palette and the hexagon clip-path live in `assets/main.css`, mirroring fz.ax variables (`#F7B808`, `#0847F7`). `nuxt generate` produces `.output/public/` and a GitHub Actions workflow uploads it to GitHub Pages, served at the custom domain `ig.fz.ax` via `public/CNAME`.

**Tech Stack:** Nuxt 3, Vue 3, TypeScript (strict, `noUncheckedIndexedAccess`), Vitest, @vue/test-utils, happy-dom, @nuxt/eslint, pnpm 9, GitHub Actions, GitHub Pages.

**Spec reference:** `docs/superpowers/specs/2026-05-03-ig-fz-ax-design.md`. This plan implements **Stage 1 — Foundations** as listed in the "Implementation order (stages)" section. No CLI, image pipeline, manifest schema, sky calendar, count field, or solstice logic is included here — those belong to later stages.

**Pre-flight sanity check.** Before starting, confirm:

- You are in the `photos` repository root: `pwd` → `/Users/rubberduck/GitHub/momentmaker/photos`
- The remote is set: `git remote -v` → `origin git@github.com:momentmaker/ig.git`
- The branch is `master`: `git branch --show-current` → `master`
- Working tree status (the spec already exists from brainstorming): `git status` → either clean or showing only untracked tooling you're about to add. The spec commits `b18f0e5` and `822122e` should be present: `git log --oneline | head -3`.
- pnpm 9 is installed: `pnpm --version` → `9.x.x` or higher
- Node 22 is installed: `node --version` → `v22.x.x` or higher

---

## Task 1: Add `.gitignore`, `LICENSE`, and an initial `README.md`

**Files:**
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `README.md`

**Why:** The repo is empty other than the spec. Before installing anything, lock down what should never be committed (build artifacts, node_modules, service-account JSONs), set the MIT license for code, and write a minimal README that names the project and points at the live site + spec.

- [ ] **Step 1: Create `.gitignore` with the standard Nuxt + Node + macOS exclusions plus the service-account safeguard from the spec**

Write `.gitignore` with exactly:

```gitignore
# Nuxt + Node
node_modules/
.output/
.nuxt/
dist/
coverage/

# Logs
*.log
.npm/
.pnpm-debug.log*

# Editor / OS
.DS_Store
.idea/
.vscode/

# Environment
.env
.env.*

# Service account JSONs MUST never be committed (see spec section "Auth")
# This is belt-and-suspenders — the canonical path is ~/.config/ig-fz-ax/sa.json
*-sa.json
sa.json
service-account*.json
```

- [ ] **Step 2: Create `LICENSE` as the MIT text**

Use the standard MIT license text. Copyright line: `Copyright (c) 2026 momentmaker`. Year is from spec date.

- [ ] **Step 3: Create `README.md`**

Write:

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

Stage 1 of 5 — foundations only. The CLI, sky calendar, count field, and solstice treatment ship in later stages.
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore LICENSE README.md
git commit -m "chore: gitignore, MIT license, initial README"
```

---

## Task 2: Initialize `package.json` and install Nuxt 3

**Files:**
- Create: `package.json`

**Why:** Nuxt is the framework. Install the same major versions as fz.ax so the two siblings stay in lockstep on tooling.

- [ ] **Step 1: Create `package.json` with the script set, dependency set, and engines field**

Write `package.json` exactly:

```json
{
  "name": "ig.fz.ax",
  "private": true,
  "license": "MIT",
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "lint": "eslint .",
    "typecheck": "nuxt typecheck"
  },
  "dependencies": {
    "nuxt": "^3.13.0",
    "vue": "latest",
    "vue-router": "latest"
  },
  "devDependencies": {
    "@nuxt/eslint": "^1.15.2",
    "@vitest/coverage-v8": "^4.1.4",
    "@vue/test-utils": "^2.4.6",
    "eslint": "^10.2.0",
    "happy-dom": "^20.9.0",
    "typescript": "^6.0.2",
    "vitest": "^4.1.4"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm install
```

Expected: pnpm prints "Done in Xs", creates `node_modules/`, generates `pnpm-lock.yaml`, and runs the `postinstall` step which calls `nuxt prepare` — that will fail right now because there's no `nuxt.config.ts` yet. **That's fine.** Proceed to Task 3 to add the config.

If pnpm complains about a missing config and `prepare` errors, ignore the prepare error; `node_modules/` and `pnpm-lock.yaml` will still be written.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: install nuxt 3 + vitest + eslint toolchain"
```

---

## Task 3: Add `nuxt.config.ts` and `tsconfig.json`

**Files:**
- Create: `nuxt.config.ts`
- Create: `tsconfig.json`

**Why:** Nuxt needs a config to know we're in static-prerender mode. The spec mandates `ssr: true` + `nuxt generate` so HTML ships fully rendered (photos need to be in HTML for og:image scrapers and JS-disabled visitors). The TS config matches fz.ax strict mode (including `noUncheckedIndexedAccess`).

- [ ] **Step 1: Create `nuxt.config.ts`**

Write exactly:

```typescript
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  ssr: true,
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/'],
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
        { name: 'theme-color', content: '#F7B808' }
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

- [ ] **Step 2: Create `tsconfig.json`**

Write exactly:

```json
{
  "extends": "./.nuxt/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- [ ] **Step 3: Re-run `nuxt prepare` to materialize `.nuxt/`**

Run:
```bash
pnpm prepare
```

Expected: Nuxt creates `.nuxt/tsconfig.json`, `.nuxt/eslint.config.mjs`, etc. No errors.

- [ ] **Step 4: Verify typecheck passes (no source files yet, so this is a smoke check)**

Run:
```bash
pnpm typecheck
```

Expected: PASS with zero errors. The repo has no `.ts`/`.vue` source files yet, so the typecheck has nothing to complain about.

- [ ] **Step 5: Commit**

```bash
git add nuxt.config.ts tsconfig.json
git commit -m "chore: nuxt config (static, ssr off) + ts strict"
```

---

## Task 4: Add ESLint config

**Files:**
- Create: `eslint.config.mjs`

**Why:** Linting catches drift before review. fz.ax uses the `@nuxt/eslint` flat config wrapper; mirror it.

- [ ] **Step 1: Create `eslint.config.mjs`**

Write exactly:

```javascript
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: ['coverage/**', '.nuxt/**', '.output/**', 'dist/**'],
})
```

- [ ] **Step 2: Run lint to confirm it loads cleanly**

Run:
```bash
pnpm lint
```

Expected: PASS with zero errors / warnings. No source files exist yet, so the linter has nothing to flag.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore: nuxt eslint flat config"
```

---

## Task 5: Add Vitest config and a smoke test

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.spec.ts`

**Why:** Wire up Vitest before adding logic, so every later task has a test runner ready. The smoke test confirms Vitest, happy-dom, and the alias resolution all work.

- [ ] **Step 1: Create `vitest.config.ts`**

Write exactly:

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['composables/**/*.ts', 'utils/**/*.ts', 'components/**/*.vue'],
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
```

- [ ] **Step 2: Write the smoke test**

Create `tests/smoke.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('vitest smoke', () => {
  it('runs in happy-dom and has document', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement).toBeTypeOf('function')
  })
})
```

- [ ] **Step 3: Run the test to confirm Vitest is wired**

Run:
```bash
pnpm test
```

Expected: 1 test passes. Output contains `Tests  1 passed (1)`.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/smoke.spec.ts
git commit -m "chore: vitest config + smoke test"
```

---

## Task 6: Add the site CSS palette and hexagon utilities

**Files:**
- Create: `assets/main.css`

**Why:** The spec calls for the fz.ax palette (`#F7B808` + `#0847F7`) and hex glyph vocabulary, with chrome quieter than fz.ax. We define the variables, base typography, and a single `.hex-clip` utility class up front so every later component just consumes them.

- [ ] **Step 1: Create `assets/main.css`**

Write exactly:

```css
:root {
  --ig-yellow: #F7B808;
  --ig-blue: #0847F7;
  --ig-bg: #ffffff;
  --ig-fg: #111111;
  --ig-fg-faint: #888888;
  --ig-gold: #d4a017;

  --ig-font-body: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --ig-font-display: 'Helvetica Neue', Helvetica, Arial, sans-serif;

  --ig-tile-size-desktop: 360px;
  --ig-tile-size-mobile: 280px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ig-bg: #0d0d0d;
    --ig-fg: #f7f7f0;
    --ig-fg-faint: #777777;
  }
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--ig-bg);
  color: var(--ig-fg);
  font-family: var(--ig-font-body);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--ig-blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Hex clip-path — pointy-top regular hexagon, fills a square box exactly. Matches fz.ax sibling. */
.hex-clip {
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}

/* Long Now footer — leading zero accent */
.long-now-zero {
  color: var(--ig-yellow);
}

/* Reduced-motion support — required by spec accessibility section */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify the CSS file is valid by running the dev server briefly**

This is just a sanity check; we don't have any pages yet. Skip if confident.

- [ ] **Step 3: Commit**

```bash
git add assets/main.css
git commit -m "feat: site palette + hex clip-path utility"
```

---

## Task 7: Build `<SiteFooter/>` component (TDD)

**Files:**
- Create: `components/SiteFooter.vue`
- Create: `tests/components/SiteFooter.spec.ts`

**Why:** Footer is the first real component and is reused on every route. Spec section "Site chrome" defines exact contents: `← fz.ax` link, `02026 · the long now` (yellow zero), `CC0 photos · MIT code`. TDD this so the strings stay correct as we rearrange later.

- [ ] **Step 1: Write the failing test**

Create `tests/components/SiteFooter.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SiteFooter from '~/components/SiteFooter.vue'

describe('SiteFooter', () => {
  it('renders a back-link to fz.ax', () => {
    const wrapper = mount(SiteFooter)
    const backLink = wrapper.find('a[href="https://fz.ax"]')
    expect(backLink.exists()).toBe(true)
    expect(backLink.text()).toContain('fz.ax')
  })

  it('renders the long-now line for the current year with the leading zero in the long-now-zero class', () => {
    const wrapper = mount(SiteFooter)
    const longNow = wrapper.find('.long-now-line')
    expect(longNow.exists()).toBe(true)
    expect(longNow.text()).toContain('the long now')
    const zero = wrapper.find('.long-now-zero')
    expect(zero.exists()).toBe(true)
    expect(zero.text()).toBe('0')
  })

  it('renders the license line', () => {
    const wrapper = mount(SiteFooter)
    expect(wrapper.text()).toContain('CC0 photos')
    expect(wrapper.text()).toContain('MIT code')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
pnpm test tests/components/SiteFooter.spec.ts
```

Expected: FAIL with "Failed to resolve component" or "Cannot find module".

- [ ] **Step 3: Implement `SiteFooter.vue`**

Create `components/SiteFooter.vue`:

```vue
<script setup lang="ts">
const year = new Date().getUTCFullYear()
const yearStr = year.toString()
const leadingZero = '0'
const restOfYear = yearStr // e.g. "2026", we want to display "02026" with the leading 0 highlighted
</script>

<template>
  <footer class="site-footer">
    <a href="https://fz.ax" class="footer-back-link">← fz.ax</a>
    <span class="long-now-line">
      <span class="long-now-zero">{{ leadingZero }}</span>{{ restOfYear }} · the long now
    </span>
    <span class="footer-license">CC0 photos · MIT code</span>
  </footer>
</template>

<style scoped>
.site-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1rem;
  font-size: 0.85rem;
  color: var(--ig-fg-faint);
  border-top: 1px solid var(--ig-fg-faint);
  margin-top: 4rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-back-link {
  color: var(--ig-fg-faint);
}

.footer-back-link:hover {
  color: var(--ig-blue);
}

.long-now-line {
  letter-spacing: 0.05em;
}

@media (max-width: 600px) {
  .site-footer {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
}
</style>
```

- [ ] **Step 4: Run the test to confirm it passes**

Run:
```bash
pnpm test tests/components/SiteFooter.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/SiteFooter.vue tests/components/SiteFooter.spec.ts
git commit -m "feat: SiteFooter — fz.ax back-link + long now + license"
```

---

## Task 8: Build `<PracticeTile/>` component (TDD)

**Files:**
- Create: `components/PracticeTile.vue`
- Create: `tests/components/PracticeTile.spec.ts`

**Why:** Hexagonal tile shown on the homepage per practice. Spec section "Homepage `/`" defines: hex clip-path container, practice name in small caps, count metric, photo backdrop (Stage 1 will pass `null` since no photos exist), soft hover glow, click routes to `/<practice>`.

In Stage 1 the tile takes simple props and renders text + a placeholder. In later stages it will accept a backdrop image URL and a tint color.

- [ ] **Step 1: Write the failing test**

Create `tests/components/PracticeTile.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PracticeTile from '~/components/PracticeTile.vue'

describe('PracticeTile', () => {
  it('renders the practice name in small caps', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    const nameEl = wrapper.find('.tile-name')
    expect(nameEl.exists()).toBe(true)
    expect(nameEl.text()).toBe('sky')
    expect(nameEl.classes()).toContain('small-caps')
  })

  it('renders the metric', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'count', metric: '0 / 217', href: '/count' }
    })
    expect(wrapper.find('.tile-metric').text()).toBe('0 / 217')
  })

  it('wraps the tile in an anchor pointing at href', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    const link = wrapper.find('a.practice-tile')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/sky')
  })

  it('applies the hex-clip class for the hexagonal shape', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    expect(wrapper.find('.tile-clip').classes()).toContain('hex-clip')
  })

  it('renders without a backdrop image when none provided', () => {
    const wrapper = mount(PracticeTile, {
      props: { name: 'sky', metric: '0 days', href: '/sky' }
    })
    expect(wrapper.find('.tile-backdrop').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:
```bash
pnpm test tests/components/PracticeTile.spec.ts
```

Expected: FAIL with "Failed to resolve component" or "Cannot find module".

- [ ] **Step 3: Implement `PracticeTile.vue`**

Create `components/PracticeTile.vue`:

```vue
<script setup lang="ts">
interface Props {
  name: string
  metric: string
  href: string
  backdropUrl?: string | null
  tintColor?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  backdropUrl: null,
  tintColor: null,
})
</script>

<template>
  <a :href="props.href" class="practice-tile">
    <span class="tile-clip hex-clip">
      <img
        v-if="props.backdropUrl"
        :src="props.backdropUrl"
        :alt="`latest ${props.name}`"
        class="tile-backdrop"
      >
      <span class="tile-content">
        <span class="tile-name small-caps">{{ props.name }}</span>
        <span class="tile-metric">{{ props.metric }}</span>
      </span>
    </span>
  </a>
</template>

<style scoped>
.practice-tile {
  display: inline-block;
  width: var(--ig-tile-size-desktop);
  height: var(--ig-tile-size-desktop);
  position: relative;
  text-decoration: none;
  color: var(--ig-fg);
  transition: transform 0.3s ease;
}

.practice-tile:hover {
  transform: scale(1.02);
}

.tile-clip {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--ig-yellow);
  overflow: hidden;
}

.tile-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.6;
}

.tile-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  z-index: 1;
}

.tile-name {
  font-size: 1.5rem;
  letter-spacing: 0.15em;
}

.small-caps {
  font-variant: small-caps;
  text-transform: lowercase;
}

.tile-metric {
  font-size: 0.95rem;
  color: var(--ig-fg);
  opacity: 0.7;
}

@media (max-width: 600px) {
  .practice-tile {
    width: var(--ig-tile-size-mobile);
    height: var(--ig-tile-size-mobile);
  }
}
</style>
```

- [ ] **Step 4: Run the test to confirm all tests pass**

Run:
```bash
pnpm test tests/components/PracticeTile.spec.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/PracticeTile.vue tests/components/PracticeTile.spec.ts
git commit -m "feat: PracticeTile — hex tile with name + metric + optional backdrop"
```

---

## Task 9: Build the homepage (`/`) and `app.vue`

**Files:**
- Create: `app.vue`
- Create: `pages/index.vue`

**Why:** The homepage renders the two practice tiles. `app.vue` is a thin shell containing a `<NuxtPage/>` plus the `<SiteFooter/>` (which appears on every route). Stage 1 hard-codes the two tiles with zero-state metrics; Stages 3 and 4 will read real counts from the manifest.

- [ ] **Step 1: Create `app.vue`**

Write exactly:

```vue
<script setup lang="ts">
</script>

<template>
  <div class="site-root">
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

.site-root > :first-child {
  flex: 1;
}
</style>
```

- [ ] **Step 2: Create `pages/index.vue` rendering two `<PracticeTile/>`s**

Write exactly:

```vue
<script setup lang="ts">
useHead({
  title: 'ig.fz.ax',
})

interface PracticeRef {
  name: string
  metric: string
  href: string
}

const practices: PracticeRef[] = [
  { name: 'sky', metric: '0 days', href: '/sky' },
  { name: 'count', metric: '0 / 217', href: '/count' },
]
</script>

<template>
  <main class="home">
    <section class="home-tiles" :class="`tiles-n-${practices.length}`">
      <PracticeTile
        v-for="p in practices"
        :key="p.name"
        :name="p.name"
        :metric="p.metric"
        :href="p.href"
      />
    </section>
    <p class="home-caption">
      <span class="long-now-zero">0</span>{{ new Date().getUTCFullYear() }} · practices
    </p>
  </main>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  flex: 1;
  gap: 2rem;
}

.home-tiles {
  display: flex;
  gap: 2rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

/* Layout-per-N from the spec */
.tiles-n-2 {
  flex-direction: row;
}

@media (max-width: 600px) {
  .tiles-n-2 {
    flex-direction: column;
  }
}

.tiles-n-3 {
  flex-direction: row;
}

.tiles-n-4 {
  flex-wrap: wrap;
  max-width: calc(2 * var(--ig-tile-size-desktop) + 2rem);
}

.tiles-n-7 {
  /* Hex flower 1 + 6 — implemented in a later stage if/when needed */
}

.home-caption {
  font-size: 0.85rem;
  color: var(--ig-fg-faint);
  letter-spacing: 0.1em;
}
</style>
```

- [ ] **Step 3: Run the dev server and visually verify**

Run:
```bash
pnpm dev
```

Expected: Nuxt prints a local URL (typically http://localhost:3000). Visit it; you should see two yellow hexagonal tiles labeled `sky` (`0 days`) and `count` (`0 / 217`), the caption underneath, and the footer with the back-link, long-now line, and license. Stop the server with `Ctrl+C`.

If the page is blank, check the browser console for errors and the terminal output. Most common issue: missing `pnpm prepare` after the config — run it.

- [ ] **Step 4: Run typecheck and lint**

Run:
```bash
pnpm typecheck && pnpm lint
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add app.vue pages/index.vue
git commit -m "feat: homepage — two placeholder practice tiles + app shell"
```

---

## Task 10: Add `public/` static assets (CNAME, robots.txt, favicon placeholder)

**Files:**
- Create: `public/CNAME`
- Create: `public/robots.txt`
- Create: `public/favicon.ico` (placeholder — see step)

**Why:** GitHub Pages reads the CNAME file to bind the custom domain `ig.fz.ax`. `robots.txt` is mandated by spec to allow indexing. The favicon is referenced by `nuxt.config.ts`; missing it would 404 on every page load.

- [ ] **Step 1: Create `public/CNAME` with the exact custom domain**

Write `public/CNAME`:

```
ig.fz.ax
```

(Single line, no trailing newline preferred but tolerated.)

- [ ] **Step 2: Create `public/robots.txt`**

Write `public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://ig.fz.ax/sitemap.xml
```

(The `sitemap.xml` is generated in Stage 5; the line is a forward-looking pointer that has no effect until the sitemap exists.)

- [ ] **Step 3: Copy fz.ax's favicon as a placeholder**

Sibling aesthetic — start with fz.ax's mark. The author can replace later if a distinct ig.fz.ax mark is desired.

```bash
cp /Users/rubberduck/GitHub/momentmaker/fz.ax/public/favicon.ico public/favicon.ico
```

Verify:
```bash
ls -la public/favicon.ico
```

Expected: a non-zero-byte ICO file.

- [ ] **Step 4: Verify the build picks up `public/`**

Run:
```bash
pnpm generate
```

Expected: build succeeds and `.output/public/CNAME`, `.output/public/robots.txt`, `.output/public/favicon.ico` all exist:

```bash
ls .output/public/CNAME .output/public/robots.txt .output/public/favicon.ico
```

- [ ] **Step 5: Commit**

```bash
git add public/CNAME public/robots.txt public/favicon.ico
git commit -m "chore: CNAME (ig.fz.ax), robots.txt, placeholder favicon"
```

---

## Task 11: Add the GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Why:** Every push to `master` should rebuild and ship. fz.ax's workflow is the proven template; reuse it verbatim with project-appropriate naming.

- [ ] **Step 1: Create the workflow file**

Write `.github/workflows/deploy.yml`:

```yaml
name: deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Set up pnpm
        uses: pnpm/action-setup@v5

      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test

      - name: Generate static site
        run: pnpm generate

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: .output/public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: github actions deploy to gh pages on push to master"
```

---

## Task 12: Push to `origin/master` and verify the live site

**Files:** none (remote-only operations)

**Why:** Stage 1's success criterion is a live placeholder site at `ig.fz.ax`. This task closes that loop.

- [ ] **Step 1: Confirm the GitHub repo exists and is empty (or accept that this push will populate it)**

Check from the browser or via:
```bash
gh repo view momentmaker/ig 2>&1 | head -20
```

If the repo doesn't exist yet, create it (private or public per author preference; spec implies public for the artifact):
```bash
gh repo create momentmaker/ig --public --description "noticing what was previously invisible"
```

If it exists and is empty, proceed. If it has prior content unrelated to this plan, **STOP** and ask the user how to reconcile — never overwrite unknown work.

- [ ] **Step 2: Push the master branch**

Run:
```bash
git push -u origin master
```

Expected: push succeeds.

- [ ] **Step 3: Configure GitHub Pages (one-time, via the GitHub UI or `gh` CLI)**

In the GitHub repo settings → Pages:
- Source: **GitHub Actions**
- Custom domain: `ig.fz.ax`
- Enforce HTTPS: ON (will be available after Cloudflare DNS resolves and GitHub provisions a cert)

If using the CLI:
```bash
gh api repos/momentmaker/ig/pages -X POST -f 'build_type=workflow' 2>/dev/null || gh api repos/momentmaker/ig/pages -X PUT -f 'build_type=workflow'
```

- [ ] **Step 4: Add the Cloudflare DNS record (one-time)**

In the Cloudflare dashboard for `fz.ax`:
- Add a CNAME record: `ig` → `momentmaker.github.io`
- Proxy status: **DNS only** (per spec — match fz.ax)
- TTL: Auto

This step is manual and outside the automation scope. Confirm with the author whether the record is already in place.

- [ ] **Step 5: Watch the workflow and verify the live site**

Run:
```bash
gh run watch --exit-status
```

Once the workflow finishes successfully, visit https://ig.fz.ax in a browser. Expected:
- Two yellow hexagonal tiles labeled `sky` and `count`
- Footer with `← fz.ax`, the long-now line, and the license line
- Clicking either tile navigates to `/sky` or `/count`, which return 404 in Stage 1 (those routes ship in Stage 3 and Stage 4) — that is **expected and correct**.

If the GitHub Pages cert is still provisioning, the site may be reachable only over HTTP for a few minutes. Wait for HTTPS to come up before declaring Stage 1 done.

- [ ] **Step 6: Tag the stage**

Once the live site is confirmed working:

```bash
git tag stage-1-foundations
git push origin stage-1-foundations
```

---

## Stage 1 Definition of Done

- [ ] `pnpm dev` starts the dev server and renders the homepage with two practice tiles
- [ ] `pnpm test` passes (smoke + SiteFooter + PracticeTile)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm generate` produces `.output/public/index.html`, `.output/public/CNAME` (`ig.fz.ax`), `.output/public/robots.txt`, `.output/public/favicon.ico`
- [ ] GitHub Actions workflow runs successfully on push to `master`
- [ ] https://ig.fz.ax is live with HTTPS and renders the placeholder homepage
- [ ] The tag `stage-1-foundations` is pushed
- [ ] No CLI, no manifest data, no per-practice routes (those are out of scope for Stage 1 by design)

After Stage 1 is done, write the Stage 2 plan (CLI + image pipeline + manifest schema) using this same plan-per-stage approach.
