import { loadConfig, DEFAULT_CONFIG } from './config'

// Cached at module load. Runtime falls back to defaults if the config file
// is malformed so a typo doesn't brick the SSR build / dev server. The CLI
// scripts call loadConfig() directly and get the strict throw.
let config = DEFAULT_CONFIG
try {
  config = loadConfig()
}
catch {
  config = DEFAULT_CONFIG
}

export const AUTHOR_TZ = config.timezone

export function currentYear(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    year: 'numeric',
  }).format(now)
}
