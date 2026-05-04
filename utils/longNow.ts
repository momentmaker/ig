// Author-timezone helper. Spec section "Sky" mandates a single configured
// author timezone shared by CLI and runtime. Stage 2 introduces config-driven
// resolution; Stage 1 hard-codes the fallback so SiteFooter and the homepage
// caption agree on the year.
export const AUTHOR_TZ = 'America/New_York'

export function currentYear(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: AUTHOR_TZ,
    year: 'numeric',
  }).format(now)
}
