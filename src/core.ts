export type Colour = number;
export type Cell = number;

export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  colourNames: readonly string[];
  palette: readonly string[];
  glyphs: readonly string[];
  target: readonly (Colour | null)[];
  initialCapacity: number;
  growthPerColour: number;
  maxCapacity: number;
}

export interface GameState {
  level: Level;
  jewels: readonly (Colour | null)[];
  shelf: readonly Colour[];
  capacity: number;
  completed: readonly Colour[];
  moves: number;
}

export type Action =
  | { type: 'pickup'; cell: Cell }
  | { type: 'place'; cell: Cell }
  | { type: 'move'; from: Cell; to: Cell };

export interface Effect {
  kind: Action['type'];
  colour: Colour;
  source: readonly Cell[];
  dest: readonly Cell[];
  shelfSlots: readonly number[];
  newlyCompleted: readonly Colour[];
  capacityBefore: number;
  capacityAfter: number;
}

export interface Step {
  state: GameState;
  effect: Effect;
}

const OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
] as const;

export function bfs(
  level: Level,
  start: Cell,
  include: (cell: Cell) => boolean,
  limit = Infinity,
): Cell[] {
  if (limit <= 0 || !include(start)) return [];
  const found = [start];
  const seen = new Set(found);
  for (let head = 0; head < found.length && found.length < limit; head++) {
    const at = found[head]!;
    const x = at % level.width;
    const y = Math.floor(at / level.width);
    for (const [dx, dy] of OFFSETS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) continue;
      const cell = ny * level.width + nx;
      if (seen.has(cell) || !include(cell)) continue;
      seen.add(cell);
      found.push(cell);
      if (found.length >= limit) break;
    }
  }
  return found;
}

export function isLiftable(state: GameState, cell: Cell): boolean {
  const jewel = state.jewels[cell];
  return jewel != null && jewel !== state.level.target[cell];
}

export function selectedBatch(state: GameState, cell: Cell, limit = Infinity): Cell[] {
  if (!isLiftable(state, cell)) return [];
  const colour = state.jewels[cell];
  return bfs(
    state.level,
    cell,
    (candidate) => isLiftable(state, candidate) && state.jewels[candidate] === colour,
    limit,
  );
}

export function emptyRegion(
  state: GameState,
  cell: Cell,
  colour: Colour,
  limit = Infinity,
): Cell[] {
  return bfs(
    state.level,
    cell,
    (candidate) =>
      state.jewels[candidate] == null && state.level.target[candidate] === colour,
    limit,
  );
}

export function shelfCount(state: GameState, colour: Colour): number {
  return state.shelf.filter((item) => item === colour).length;
}

export function resolvePickup(state: GameState, cell: Cell): Cell[] {
  return selectedBatch(state, cell, state.capacity - state.shelf.length);
}

export function resolveMove(state: GameState, from: Cell, to: Cell): { source: Cell[]; dest: Cell[] } {
  if (!isLiftable(state, from) || state.jewels[to] != null) return { source: [], dest: [] };
  const colour = state.jewels[from]!;
  if (state.level.target[to] !== colour) return { source: [], dest: [] };
  const source = selectedBatch(state, from);
  const dest = emptyRegion(state, to, colour);
  const count = Math.min(source.length, dest.length);
  return { source: source.slice(0, count), dest: dest.slice(0, count) };
}

export function resolvePlace(state: GameState, cell: Cell): Cell[] {
  if (state.jewels[cell] != null) return [];
  const colour = state.level.target[cell];
  if (colour == null) return [];
  return emptyRegion(state, cell, colour, shelfCount(state, colour));
}

export function completedColours(state: GameState): Colour[] {
  const present = new Set<Colour>();
  const incomplete = new Set<Colour>();
  state.level.target.forEach((target, cell) => {
    if (target == null) return;
    present.add(target);
    if (state.jewels[cell] !== target) incomplete.add(target);
  });
  return [...present].filter((colour) => !incomplete.has(colour)).sort((a, b) => a - b);
}

function derive(state: GameState, jewels: readonly (Colour | null)[], shelf: readonly Colour[]): GameState {
  const next = { ...state, jewels, shelf };
  const completed = completedColours(next);
  const capacity = Math.max(
    shelf.length,
    Math.min(
      state.level.maxCapacity,
      state.level.initialCapacity + completed.length * state.level.growthPerColour,
    ),
  );
  return { ...next, completed, capacity };
}

export function createState(level: Level, jewels: readonly (Colour | null)[]): GameState {
  return derive(
    { level, jewels, shelf: [], capacity: level.initialCapacity, completed: [], moves: 0 },
    jewels,
    [],
  );
}

export function reduce(state: GameState, action: Action): Step | null {
  const beforeDone = new Set(state.completed);
  const capacityBefore = state.capacity;
  let source: Cell[] = [];
  let dest: Cell[] = [];
  let shelfSlots: number[] = [];
  let colour: Colour;
  const jewels = state.jewels.slice();
  let shelf = state.shelf.slice();

  if (action.type === 'pickup') {
    source = resolvePickup(state, action.cell);
    if (!source.length) return null;
    colour = state.jewels[action.cell]!;
    source.forEach((cell) => { jewels[cell] = null; });
    shelfSlots = source.map((_, index) => shelf.length + index);
    shelf.push(...source.map(() => colour));
  } else if (action.type === 'move') {
    const move = resolveMove(state, action.from, action.to);
    source = move.source;
    dest = move.dest;
    if (!source.length) return null;
    colour = state.jewels[action.from]!;
    source.forEach((cell) => { jewels[cell] = null; });
    dest.forEach((cell) => { jewels[cell] = colour; });
  } else {
    dest = resolvePlace(state, action.cell);
    if (!dest.length) return null;
    colour = state.level.target[action.cell]!;
    let remaining = dest.length;
    const kept: Colour[] = [];
    state.shelf.forEach((item, index) => {
      if (item === colour && remaining > 0) {
        shelfSlots.push(index);
        remaining--;
      } else {
        kept.push(item);
      }
    });
    shelf = kept;
    dest.forEach((cell) => { jewels[cell] = colour; });
  }

  const next = derive({ ...state, moves: state.moves + 1 }, jewels, shelf);
  return {
    state: next,
    effect: {
      kind: action.type,
      colour,
      source,
      dest,
      shelfSlots,
      newlyCompleted: next.completed.filter((item) => !beforeDone.has(item)),
      capacityBefore,
      capacityAfter: next.capacity,
    },
  };
}

export function isWon(state: GameState): boolean {
  return state.shelf.length === 0 &&
    state.level.target.every((target, cell) => target == null || state.jewels[cell] === target);
}

export function regions(
  state: GameState,
  predicate: (cell: Cell) => boolean,
  colourAt: (cell: Cell) => Colour | null,
): { colour: Colour; rep: Cell; cells: Cell[] }[] {
  const seen = new Set<Cell>();
  const result: { colour: Colour; rep: Cell; cells: Cell[] }[] = [];
  state.level.target.forEach((_, cell) => {
    if (seen.has(cell) || !predicate(cell)) return;
    const colour = colourAt(cell);
    if (colour == null) return;
    const cells = bfs(state.level, cell, (candidate) =>
      !seen.has(candidate) && predicate(candidate) && colourAt(candidate) === colour);
    cells.forEach((item) => seen.add(item));
    result.push({ colour, rep: cell, cells });
  });
  return result;
}

export function legalMoves(state: GameState): Action[] {
  const empties = regions(
    state,
    (cell) => state.jewels[cell] == null && state.level.target[cell] != null,
    (cell) => state.level.target[cell],
  );
  const pickups = regions(state, (cell) => isLiftable(state, cell), (cell) => state.jewels[cell]);
  const moves: Action[] = [];
  empties.forEach((region) => {
    if (shelfCount(state, region.colour) > 0) moves.push({ type: 'place', cell: region.rep });
  });
  pickups.forEach((from) => {
    const target = empties.find((empty) => empty.colour === from.colour);
    if (target) moves.push({ type: 'move', from: from.rep, to: target.rep });
  });
  if (state.shelf.length < state.capacity) {
    pickups.forEach((region) => moves.push({ type: 'pickup', cell: region.rep }));
  }
  return moves;
}

export function stateKey(state: GameState): string {
  return `${state.jewels.map((item) => item ?? '_').join('')}|${[...state.shelf].sort().join('')}`;
}
