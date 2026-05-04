import { DEFAULT_CONFIG } from './config'

// Browser-safe: uses the baked DEFAULT_CONFIG.timezone. The CLI side runs
// against the user's ~/.config/ig-fz-ax/config.json via scripts/lib/config-loader.ts.
// Spec note: when timezone overrides become a real need on the rendered site,
// pipe via Nuxt runtimeConfig at build time.
export const AUTHOR_TZ = DEFAULT_CONFIG.timezone

export function currentYear(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_CONFIG.timezone,
    year: 'numeric',
  }).format(now)
}
