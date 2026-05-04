import { describe, it, expect } from 'vitest'
import { loadConfig } from '~/scripts/lib/config-loader'
import { DEFAULT_CONFIG, type IgConfig } from '~/utils/config'
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
    const path = makeTempConfig({ timezone: 'America/Los_Angeles' })
    const cfg = loadConfig(path)
    expect(cfg.timezone).toBe('America/Los_Angeles')
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
    const path = makeTempConfig({})
    expect(() => loadConfig(path)).toThrow(/timezone/i)
    rmSync(path, { force: true })
  })

  it('throws when timezone is not a recognized IANA name', () => {
    const path = makeTempConfig({ timezone: 'Mars/Olympus_Mons' })
    expect(() => loadConfig(path)).toThrow(/timezone/i)
    rmSync(path, { force: true })
  })

  it('ignores unknown fields (forwards-compat)', () => {
    const path = makeTempConfig({ timezone: 'UTC', someFutureField: 'x' })
    const cfg = loadConfig(path)
    expect(cfg.timezone).toBe('UTC')
    rmSync(path, { force: true })
  })

  it('exposes a typed shape', () => {
    const cfg: IgConfig = DEFAULT_CONFIG
    expect(typeof cfg.timezone).toBe('string')
  })
})
