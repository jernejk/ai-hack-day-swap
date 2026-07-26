import type { Colour, Level } from './core';

const rows = [
  'AABBCCDD',
  'AABBCCDD',
  'CCDDAABB',
  'CCDDAABB',
  'BBAADDCC',
  'BBAADDCC',
  'DDCCBBAA',
  'DDCCBBAA',
] as const;

const ids: Record<string, Colour> = { A: 0, B: 1, C: 2, D: 3 };

export const LEVEL: Level = {
  id: 'neural-matrix',
  name: 'Neural Matrix',
  width: 8,
  height: 8,
  colourNames: ['ion cyan', 'compute violet', 'signal coral', 'data gold'],
  palette: ['#59e4d3', '#9a7cff', '#ff6f7d', '#f6cc5c'],
  glyphs: ['○', '△', '◇', '＋'],
  target: rows.flatMap((row) => [...row].map((char) => ids[char]!)),
  initialCapacity: 8,
  growthPerColour: 3,
  maxCapacity: 20,
};

/** A colour-cycle derangement. Counts are equal, so the histogram is exact. */
export const START_JEWELS = LEVEL.target.map((target) =>
  target == null ? null : (target + 1) % LEVEL.palette.length,
);

export function histogram(values: readonly (Colour | null)[]): number[] {
  const count = new Array(LEVEL.palette.length).fill(0) as number[];
  values.forEach((value) => { if (value != null) count[value]++; });
  return count;
}
