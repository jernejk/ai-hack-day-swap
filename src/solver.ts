import {
  isWon,
  legalMoves,
  reduce,
  regions,
  shelfCount,
  stateKey,
  type Action,
  type GameState,
} from './core';

export interface Solution {
  solved: boolean;
  trace: Action[];
  nodes: number;
}

export function solve(initial: GameState, budget = 30_000): Solution {
  const seen = new Set<string>();
  let nodes = 0;

  function settle(state: GameState, trace: Action[]): GameState {
    let current = state;
    for (;;) {
      const safe = legalMoves(current).filter((move) => move.type !== 'pickup');
      if (!safe.length) return current;
      const action = safe[0]!;
      const step = reduce(current, action);
      if (!step) return current;
      trace.push(action);
      current = step.state;
    }
  }

  function search(state: GameState, trace: Action[]): Action[] | null {
    if (nodes++ >= budget) return null;
    const local = trace.slice();
    const current = settle(state, local);
    if (isWon(current)) return local;
    const key = stateKey(current);
    if (seen.has(key)) return null;
    seen.add(key);

    const pickups = regions(
      current,
      (cell) => current.jewels[cell] != null && current.jewels[cell] !== current.level.target[cell],
      (cell) => current.jewels[cell],
    ).map((region) => {
      const step = reduce(current, { type: 'pickup', cell: region.rep });
      let opened = 0;
      if (step) {
        step.effect.source.forEach((cell) => {
          const target = current.level.target[cell];
          if (target != null) opened += shelfCount(step.state, target);
        });
      }
      return { region, step, opened };
    }).filter((item) => item.step != null);

    pickups.sort((a, b) => b.opened - a.opened || a.region.cells.length - b.region.cells.length);
    for (const candidate of pickups) {
      const action: Action = { type: 'pickup', cell: candidate.region.rep };
      const won = search(candidate.step!.state, [...local, action]);
      if (won) return won;
    }
    return null;
  }

  const trace = search(initial, []);
  return { solved: trace != null, trace: trace ?? [], nodes };
}
