import { describe, expect, it } from 'vitest';
import {
  bfs,
  createState,
  isLiftable,
  isWon,
  legalMoves,
  reduce,
  resolveMove,
  selectedBatch,
  type GameState,
  type Level,
} from '../src/core';
import { histogram, LEVEL, START_JEWELS } from '../src/level';
import { solve } from '../src/solver';

function tiny(target: number[], jewels: (number | null)[], shelf: number[] = []): GameState {
  const level: Level = {
    id: 'test',
    name: 'Test',
    width: target.length,
    height: 1,
    colourNames: ['cyan', 'violet', 'gold'],
    palette: ['#0ff', '#80f', '#fc0'],
    glyphs: ['o', 'v', '+'],
    target,
    initialCapacity: 3,
    growthPerColour: 3,
    maxCapacity: 9,
  };
  const base = createState(level, jewels);
  return { ...base, shelf, capacity: Math.max(base.capacity, shelf.length), completed: [] };
}

describe('regions and selection', () => {
  it('uses 8-connectivity, including diagonals', () => {
    const level = { ...LEVEL, width: 2, height: 2, target: [0, 1, 1, 0] };
    expect(bfs(level, 0, (cell) => cell === 0 || cell === 3)).toEqual([0, 3]);
  });

  it('does not include correctly seated jewels in a selected batch', () => {
    const state = tiny([0, 1, 0], [1, 1, 1]);
    expect(isLiftable(state, 1)).toBe(false);
    expect(selectedBatch(state, 0)).toEqual([0]);
  });
});

describe('movement invariants', () => {
  it('moves directly to empty matching sockets without touching the shelf', () => {
    const state = tiny([1, 0, 2], [0, null, 2], [1]);
    const move = reduce(state, { type: 'move', from: 0, to: 1 });
    expect(move).not.toBeNull();
    expect(move!.state.shelf).toEqual([1]);
    expect(move!.state.jewels).toEqual([null, 0, 2]);
  });

  it('caps a direct move and never targets an occupied socket', () => {
    const state = tiny([1, 0, 0], [0, null, 1]);
    expect(resolveMove(state, 0, 1)).toEqual({ source: [0], dest: [1] });
    expect(resolveMove(state, 0, 2)).toEqual({ source: [], dest: [] });
    expect(legalMoves(state)).not.toContainEqual({ type: 'move', from: 0, to: 2 });
  });

  it('pours a non-front shelf colour rather than behaving like FIFO', () => {
    const state = tiny([0, 1, 0], [2, null, 2], [0, 1, 0]);
    const step = reduce(state, { type: 'place', cell: 1 });
    expect(step).not.toBeNull();
    expect(step!.state.jewels[1]).toBe(1);
    expect(step!.state.shelf).toEqual([0, 0]);
    expect(step!.effect.shelfSlots).toEqual([1]);
  });

  it('rejects an occupied matching target instead of swapping or overwriting', () => {
    const state = tiny([1, 0], [0, 1]);
    const snapshot = JSON.stringify(state);
    expect(reduce(state, { type: 'move', from: 0, to: 1 })).toBeNull();
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('grows capacity by 3 when a colour completes', () => {
    const state = tiny([0, 1], [null, 1], [0]);
    const step = reduce(state, { type: 'place', cell: 0 });
    expect(step!.effect.newlyCompleted).toContain(0);
    expect(step!.state.capacity).toBe(9);
  });

  it('requires an empty shelf as well as matched sockets to win', () => {
    const matched = tiny([0, 1], [0, 1], [2]);
    expect(isWon(matched)).toBe(false);
    expect(isWon({ ...matched, shelf: [] })).toBe(true);
  });
});

describe('certified level', () => {
  it('preserves the target histogram exactly', () => {
    expect(histogram(START_JEWELS)).toEqual(histogram(LEVEL.target));
  });

  it('replays a legal winning certificate through the production reducer', () => {
    let state = createState(LEVEL, START_JEWELS);
    const result = solve(state);
    expect(result.solved).toBe(true);
    expect(result.trace.length).toBeGreaterThan(0);
    for (const action of result.trace) {
      const step = reduce(state, action);
      expect(step, JSON.stringify(action)).not.toBeNull();
      state = step!.state;
    }
    expect(isWon(state)).toBe(true);
    expect(state.shelf).toEqual([]);
  });
});
