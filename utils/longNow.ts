import { loadConfig } from './config'

export function currentYear(now: Date = new Date()): string {
  const tz = loadConfig().timezone
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
  }).format(now)
}

export const AUTHOR_TZ = loadConfig().timezone
