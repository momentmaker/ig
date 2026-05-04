export type SolsticeKind = 'vernal' | 'summer' | 'autumnal' | 'winter'

const TABLE: Record<string, SolsticeKind> = {
  '2024-03-20': 'vernal', '2024-06-20': 'summer', '2024-09-22': 'autumnal', '2024-12-21': 'winter',
  '2025-03-20': 'vernal', '2025-06-21': 'summer', '2025-09-22': 'autumnal', '2025-12-21': 'winter',
  '2026-03-20': 'vernal', '2026-06-21': 'summer', '2026-09-23': 'autumnal', '2026-12-21': 'winter',
  '2027-03-20': 'vernal', '2027-06-21': 'summer', '2027-09-23': 'autumnal', '2027-12-22': 'winter',
  '2028-03-20': 'vernal', '2028-06-20': 'summer', '2028-09-22': 'autumnal', '2028-12-21': 'winter',
  '2029-03-20': 'vernal', '2029-06-21': 'summer', '2029-09-22': 'autumnal', '2029-12-21': 'winter',
  '2030-03-20': 'vernal', '2030-06-21': 'summer', '2030-09-22': 'autumnal', '2030-12-21': 'winter',
  '2031-03-20': 'vernal', '2031-06-21': 'summer', '2031-09-23': 'autumnal', '2031-12-22': 'winter',
  '2032-03-20': 'vernal', '2032-06-20': 'summer', '2032-09-22': 'autumnal', '2032-12-21': 'winter',
  '2033-03-20': 'vernal', '2033-06-21': 'summer', '2033-09-22': 'autumnal', '2033-12-21': 'winter',
  '2034-03-20': 'vernal', '2034-06-21': 'summer', '2034-09-22': 'autumnal', '2034-12-21': 'winter',
  '2035-03-20': 'vernal', '2035-06-21': 'summer', '2035-09-23': 'autumnal', '2035-12-22': 'winter',
  '2036-03-20': 'vernal', '2036-06-20': 'summer', '2036-09-22': 'autumnal', '2036-12-21': 'winter',
  '2037-03-20': 'vernal', '2037-06-21': 'summer', '2037-09-22': 'autumnal', '2037-12-21': 'winter',
  '2038-03-20': 'vernal', '2038-06-21': 'summer', '2038-09-22': 'autumnal', '2038-12-21': 'winter',
  '2039-03-20': 'vernal', '2039-06-21': 'summer', '2039-09-23': 'autumnal', '2039-12-22': 'winter',
  '2040-03-20': 'vernal', '2040-06-20': 'summer', '2040-09-22': 'autumnal', '2040-12-21': 'winter',
  '2041-03-20': 'vernal', '2041-06-21': 'summer', '2041-09-22': 'autumnal', '2041-12-21': 'winter',
  '2042-03-20': 'vernal', '2042-06-21': 'summer', '2042-09-22': 'autumnal', '2042-12-21': 'winter',
  '2043-03-20': 'vernal', '2043-06-21': 'summer', '2043-09-23': 'autumnal', '2043-12-22': 'winter',
  '2044-03-19': 'vernal', '2044-06-20': 'summer', '2044-09-22': 'autumnal', '2044-12-21': 'winter',
  '2045-03-20': 'vernal', '2045-06-21': 'summer', '2045-09-22': 'autumnal', '2045-12-21': 'winter',
  '2046-03-20': 'vernal', '2046-06-21': 'summer', '2046-09-22': 'autumnal', '2046-12-21': 'winter',
  '2047-03-20': 'vernal', '2047-06-21': 'summer', '2047-09-23': 'autumnal', '2047-12-22': 'winter',
  '2048-03-19': 'vernal', '2048-06-20': 'summer', '2048-09-22': 'autumnal', '2048-12-21': 'winter',
  '2049-03-20': 'vernal', '2049-06-21': 'summer', '2049-09-22': 'autumnal', '2049-12-21': 'winter',
  '2050-03-20': 'vernal', '2050-06-21': 'summer', '2050-09-22': 'autumnal', '2050-12-21': 'winter',
}

export function isSolstice(dateYYYYMMDD: string): boolean {
  return Object.hasOwn(TABLE, dateYYYYMMDD)
}

export function solsticeKind(dateYYYYMMDD: string): SolsticeKind | null {
  return TABLE[dateYYYYMMDD] ?? null
}
