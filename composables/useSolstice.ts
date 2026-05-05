import { activeWindow, type SolsticeKind } from '~/utils/solstice'

export interface SolsticeState {
  active: boolean
  kind: SolsticeKind | null
  anchor: string | null
}

export function useSolstice(): SolsticeState {
  const config = useRuntimeConfig()
  const buildDate = config.public.buildDate as string
  const win = activeWindow(buildDate)
  if (win === null) return { active: false, kind: null, anchor: null }
  return { active: true, kind: win.kind, anchor: win.anchor }
}
