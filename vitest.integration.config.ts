import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/integration/**/*.spec.ts'],
    // axe.spec.ts uses @playwright/test, not vitest — runs via `pnpm test:axe`.
    exclude: ['tests/integration/axe.spec.ts'],
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
