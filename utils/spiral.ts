// Centered-hex spiral. Number 0 at the center; rings 1..8 spiral outward
// counter-clockwise starting from the east-most cell of each ring.
//
// Hex axial coordinates (q, r). Distance from origin = max(|q|, |r|, |q+r|).

export const MAX_N = 216 // rings 0..8 totalling 1+6+12+18+24+30+36+42+48 = 217

interface Step { dq: number, dr: number }
const SIDE_DIRS: Step[] = [
  { dq: 0, dr: -1 }, // step from (R, 0) — first move is N (decreasing r)
  { dq: -1, dr: 0 }, // W
  { dq: -1, dr: 1 }, // SW
  { dq: 0, dr: 1 }, // S
  { dq: 1, dr: 0 }, // SE (back to east edge from below)
  { dq: 1, dr: -1 }, // NE (return to start)
]

export function ringOf(n: number): number {
  if (n === 0) return 0
  let ring = 1
  while (3 * ring * (ring + 1) < n) ring++
  return ring
}

export function ringStart(ring: number): number {
  if (ring === 0) return 0
  return 3 * ring * (ring - 1) + 1
}

export function spiralCoord(n: number): { q: number, r: number } {
  if (!Number.isInteger(n)) {
    throw new Error(`n must be an integer, got ${n}`)
  }
  if (n < 0 || n > MAX_N) {
    throw new Error(`n must be in 0-${MAX_N}, got ${n}`)
  }
  if (n === 0) return { q: 0, r: 0 }
  const ring = ringOf(n)
  const idx = n - ringStart(ring)
  const side = Math.floor(idx / ring)
  const stepInSide = idx % ring

  let q = ring
  let r = 0
  for (let s = 0; s < side; s++) {
    const d = SIDE_DIRS[s]!
    q += d.dq * ring
    r += d.dr * ring
  }
  const d = SIDE_DIRS[side]!
  q += d.dq * stepInSide
  r += d.dr * stepInSide
  return { q, r }
}
