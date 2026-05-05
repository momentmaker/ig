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
