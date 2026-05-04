import manifestJson from '~/data/manifest.json'
import { validateManifest, type Manifest } from '~/utils/manifestSchema'

// Validated once at module load. Build fails (with a useful error) if the
// committed manifest violates the schema — the pre-commit hook should catch
// this earlier, but we belt-and-suspenders here too.
const data: unknown = manifestJson
validateManifest(data)
const manifest: Manifest = data

export function useManifest(): Manifest {
  return manifest
}
