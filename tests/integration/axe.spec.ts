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
