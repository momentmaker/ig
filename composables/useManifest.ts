import manifestJson from '~/data/manifest.json'
import { validateManifest, type Manifest, type Entry, type SkyEntry, type CountEntry } from '~/utils/manifestSchema'

// Validated once at module load. Build fails (with a useful error) if the
// committed manifest violates the schema — the pre-commit hook should catch
// this earlier, but we belt-and-suspenders here too.
const data: unknown = manifestJson
validateManifest(data)
const manifest: Manifest = data

export function useManifest(): Manifest {
  return manifest
}

export function ogImageForRoot(entries: Entry[], section: 'home' | 'sky' | 'count'): string {
  function latestSky(): SkyEntry | null {
    const skies = entries.filter((e): e is SkyEntry => e.type === 'sky')
    skies.sort((a, b) => b.date.localeCompare(a.date))
    return skies[0] ?? null
  }
  function latestCount(): CountEntry | null {
    const counts = entries.filter((e): e is CountEntry => e.type === 'count')
    counts.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date)
      if (byDate !== 0) return byDate
      return b.n - a.n
    })
    return counts[0] ?? null
  }
  function latestAny(): Entry | null {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0] ?? null
  }
  if (section === 'home') {
    const sky = latestSky()
    const count = latestCount()
    if (sky !== null && count !== null) {
      return `/og/${homeOgKey(sky.ogSha, count.ogSha)}.png`
    }
    return '/og-brand.png'
  }
  const order: Array<() => Entry | null> =
    section === 'sky' ? [latestSky, latestAny] : [latestCount, latestAny]
  for (const fn of order) {
    const e = fn()
    if (e !== null) return `/og/${e.ogSha}.png`
  }
  return '/og-brand.png'
}

export function homeOgKey(skyOgSha: string, countOgSha: string): string {
  return `home-${skyOgSha.slice(0, 16)}-${countOgSha.slice(0, 16)}`
}
