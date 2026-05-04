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
