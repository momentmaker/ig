// Browser-safe types + defaults. The Node-only loadConfig() lives in
// scripts/lib/config-loader.ts so it doesn't drag node:fs/node:os/node:path
// into the runtime bundle when imported transitively from utils/longNow.ts.

export interface IgConfig {
  timezone: string
}

export const DEFAULT_CONFIG: IgConfig = {
  timezone: 'America/New_York',
}
