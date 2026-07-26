import './style.css';
import {
  createState,
  emptyRegion,
  isLiftable,
  isWon,
  reduce,
  selectedBatch,
  shelfCount,
  stateKey,
  type Action,
  type Effect,
  type GameState,
} from './core';
import { LEVEL, START_JEWELS } from './level';
import { solve } from './solver';

type BoardSelection = { kind: 'board'; colour: number; origin: number; cells: number[] };
type ShelfSelection = { kind: 'shelf'; colour: number };
type Selection = BoardSelection | ShelfSelection;

const board = document.querySelector<HTMLDivElement>('#board')!;
const shelf = document.querySelector<HTMLDivElement>('#shelf')!;
const shelfSlots = document.querySelector<HTMLDivElement>('#shelf-slots')!;
const statusLine = document.querySelector<HTMLDivElement>('#status')!;
const winPanel = document.querySelector<HTMLDivElement>('#win')!;
const undoButton = document.querySelector<HTMLButtonElement>('#undo')!;

let state = createState(LEVEL, START_JEWELS);
let selection: Selection | null = null;
let history: GameState[] = [];
let winShown = false;

function colourName(colour: number): string {
  return LEVEL.colourNames[colour]!;
}

function setStatus(message: string): void {
  statusLine.textContent = message;
}

function destinationCells(colour: number): Set<number> {
  const result = new Set<number>();
  LEVEL.target.forEach((target, cell) => {
    if (target !== colour || state.jewels[cell] != null) return;
    emptyRegion(state, cell, colour).forEach((item) => result.add(item));
  });
  return result;
}

function render(): void {
  const destinations = selection ? destinationCells(selection.colour) : new Set<number>();
  board.innerHTML = '';
  LEVEL.target.forEach((target, cell) => {
    if (target == null) return;
    const jewel = state.jewels[cell];
    const selected = selection?.kind === 'board' && selection.cells.includes(cell);
    const destination = destinations.has(cell);
    const correct = jewel === target;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'socket',
      `target-${target}`,
      correct ? 'correct' : '',
      jewel == null ? 'empty' : '',
      selected ? 'selected' : '',
      destination ? 'destination' : '',
    ].filter(Boolean).join(' ');
    button.dataset.cell = String(cell);
    button.dataset.testid = `cell-${cell}`;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-selected', String(selected));
    const targetLabel = colourName(target);
    const jewelLabel = jewel == null ? 'empty' : `${colourName(jewel)} jewel`;
    button.setAttribute(
      'aria-label',
      `Cell ${cell + 1}: ${targetLabel} target, ${jewelLabel}${correct ? ', correct' : ''}${destination ? ', legal destination' : ''}`,
    );
    button.style.setProperty('--socket-colour', LEVEL.palette[target]!);
    if (jewel != null) {
      const token = document.createElement('span');
      token.className = `jewel jewel-${jewel}`;
      token.style.setProperty('--jewel-colour', LEVEL.palette[jewel]!);
      token.textContent = LEVEL.glyphs[jewel]!;
      token.setAttribute('aria-hidden', 'true');
      button.append(token);
      if (!correct) {
        const targetGlyph = document.createElement('span');
        targetGlyph.className = 'target-glyph';
        targetGlyph.textContent = LEVEL.glyphs[target]!;
        targetGlyph.setAttribute('aria-hidden', 'true');
        button.append(targetGlyph);
      }
    } else {
      const emptyGlyph = document.createElement('span');
      emptyGlyph.className = 'empty-glyph';
      emptyGlyph.textContent = LEVEL.glyphs[target]!;
      emptyGlyph.setAttribute('aria-hidden', 'true');
      button.append(emptyGlyph);
    }
    button.addEventListener('click', () => tapCell(cell));
    board.append(button);
  });

  shelfSlots.innerHTML = '';
  for (let slot = 0; slot < LEVEL.maxCapacity; slot++) {
    const item = state.shelf[slot];
    const slotButton = document.createElement('button');
    slotButton.type = 'button';
    slotButton.className = `shelf-slot ${slot >= state.capacity ? 'locked' : ''}`;
    slotButton.dataset.slot = String(slot);
    slotButton.setAttribute('aria-label',
      slot >= state.capacity ? `Locked buffer slot ${slot + 1}` :
      item == null ? `Empty buffer slot ${slot + 1}` :
      `${colourName(item)} jewel in buffer slot ${slot + 1}`);
    slotButton.disabled = slot >= state.capacity;
    if (item != null) {
      const token = document.createElement('span');
      token.className = `jewel shelf-jewel jewel-${item} ${selection?.kind === 'shelf' && selection.colour === item ? 'selected' : ''}`;
      token.style.setProperty('--jewel-colour', LEVEL.palette[item]!);
      token.textContent = LEVEL.glyphs[item]!;
      token.setAttribute('aria-hidden', 'true');
      slotButton.append(token);
    }
    slotButton.addEventListener('click', (event) => {
      event.stopPropagation();
      tapShelfSlot(slot);
    });
    shelfSlots.append(slotButton);
  }

  shelf.classList.toggle('offered', selection?.kind === 'board' && state.shelf.length < state.capacity);
  document.querySelector('#capacity-readout')!.textContent = `${state.shelf.length} / ${state.capacity}`;
  const remaining = LEVEL.target.filter((target, cell) => target != null && state.jewels[cell] !== target).length;
  document.querySelector('#remaining')!.textContent = String(remaining);
  undoButton.disabled = history.length === 0;
  document.body.classList.toggle('won', isWon(state));
}

function selectBoard(cell: number, announce = true): void {
  const cells = selectedBatch(state, cell);
  if (!cells.length) {
    setStatus('That token is already aligned.');
    return;
  }
  selection = { kind: 'board', colour: state.jewels[cell]!, origin: cell, cells };
  if (announce) setStatus(`${cells.length} ${colourName(state.jewels[cell]!)} token${cells.length === 1 ? '' : 's'} selected.`);
  render();
}

function selectShelf(colour: number, announce = true): void {
  selection = { kind: 'shelf', colour };
  if (announce) setStatus(`${shelfCount(state, colour)} ${colourName(colour)} buffer token${shelfCount(state, colour) === 1 ? '' : 's'} selected.`);
  render();
}

function keepSelection(previous: Selection): void {
  if (previous.kind === 'shelf') {
    if (shelfCount(state, previous.colour)) selectShelf(previous.colour, false);
    else selection = null;
    return;
  }
  const survivor = previous.cells.find((cell) =>
    state.jewels[cell] === previous.colour && isLiftable(state, cell));
  if (survivor != null) selectBoard(survivor, false);
  else selection = null;
}

function rectCentre(element: Element | null): { x: number; y: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function captureSources(action: Action, current: GameState): ({ x: number; y: number } | null)[] {
  if (action.type === 'pickup') {
    return selectedBatch(current, action.cell, current.capacity - current.shelf.length)
      .map((cell) => rectCentre(board.querySelector(`[data-cell="${cell}"] .jewel`)));
  }
  if (action.type === 'move') {
    const colour = current.jewels[action.from];
    if (colour == null) return [];
    const source = selectedBatch(current, action.from);
    const destinationCount = emptyRegion(current, action.to, colour).length;
    return source.slice(0, destinationCount)
      .map((cell) => rectCentre(board.querySelector(`[data-cell="${cell}"] .jewel`)));
  }
  const colour = current.level.target[action.cell];
  if (colour == null) return [];
  const count = emptyRegion(current, action.cell, colour, shelfCount(current, colour)).length;
  return current.shelf
    .map((item, slot) => item === colour ? slot : -1)
    .filter((slot) => slot >= 0)
    .slice(0, count)
    .map((slot) => rectCentre(shelfSlots.querySelector(`[data-slot="${slot}"] .jewel`)));
}

function destinationCentres(effect: Effect): ({ x: number; y: number } | null)[] {
  if (effect.kind === 'pickup') {
    return effect.shelfSlots.map((slot) => rectCentre(shelfSlots.querySelector(`[data-slot="${slot}"]`)));
  }
  return effect.dest.map((cell) => rectCentre(board.querySelector(`[data-cell="${cell}"]`)));
}

function animateEffect(effect: Effect, sources: ({ x: number; y: number } | null)[]): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = destinationCentres(effect);
  const root = document.querySelector('#particles')!;
  sources.forEach((from, index) => {
    const to = targets[index];
    if (!from || !to) return;
    const flying = document.createElement('span');
    flying.className = 'flying-jewel';
    flying.textContent = LEVEL.glyphs[effect.colour]!;
    flying.style.setProperty('--jewel-colour', LEVEL.palette[effect.colour]!);
    flying.style.left = `${from.x}px`;
    flying.style.top = `${from.y}px`;
    root.append(flying);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let delay = 0;
    for (let prior = 0; prior < index; prior++) delay += Math.max(34, 78 - prior * 9);
    const animation = flying.animate([
      { transform: 'translate(-50%, -50%) scale(1)', offset: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 30}px)) scale(1.14)`, offset: 0.52 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.92)`, offset: 0.88 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, offset: 1 },
    ], { duration: 390, delay, easing: 'cubic-bezier(.18,.8,.25,1)', fill: 'forwards' });
    animation.finished.finally(() => flying.remove());
  });
}

function celebrate(effect: Effect): void {
  effect.newlyCompleted.forEach((colour, colourIndex) => {
    window.setTimeout(() => {
      document.querySelectorAll(`.target-${colour}`).forEach((cell) => {
        cell.classList.add('colour-sweep');
        window.setTimeout(() => cell.classList.remove('colour-sweep'), 1500);
      });
      setStatus(`${colourName(colour)} aligned. Buffer expanded by 3.`);
    }, colourIndex * 100);
  });
  if (effect.capacityAfter > effect.capacityBefore) {
    for (let slot = effect.capacityBefore; slot < effect.capacityAfter; slot++) {
      window.setTimeout(() => {
        shelfSlots.querySelector(`[data-slot="${slot}"]`)?.classList.add('unlocking');
      }, 180 + (slot - effect.capacityBefore) * 75);
    }
  }
}

function commit(action: Action): boolean {
  const before = state;
  const sources = captureSources(action, before);
  const step = reduce(before, action);
  if (!step) {
    setStatus('That destination is occupied or does not match.');
    board.classList.add('reject');
    window.setTimeout(() => board.classList.remove('reject'), 260);
    return false;
  }
  history.push(before);
  state = step.state;
  render();
  animateEffect(step.effect, sources);
  celebrate(step.effect);
  setStatus(`${colourName(step.effect.colour)} moved · ${state.moves} move${state.moves === 1 ? '' : 's'}.`);
  if (isWon(state)) showWin();
  return true;
}

function tapCell(cell: number): void {
  if (isWon(state)) return;
  if (selection && state.jewels[cell] == null && LEVEL.target[cell] === selection.colour) {
    const previous = selection;
    const action: Action = previous.kind === 'shelf'
      ? { type: 'place', cell }
      : { type: 'move', from: previous.origin, to: cell };
    if (commit(action)) {
      keepSelection(previous);
      render();
    }
    return;
  }
  if (selection && state.jewels[cell] != null && LEVEL.target[cell] === selection.colour) {
    setStatus('That matching socket is occupied. Empty it first.');
    board.querySelector(`[data-cell="${cell}"]`)?.classList.add('invalid');
    window.setTimeout(() => board.querySelector(`[data-cell="${cell}"]`)?.classList.remove('invalid'), 260);
    return;
  }
  if (isLiftable(state, cell)) {
    if (selection?.kind === 'board' && selection.cells.includes(cell)) {
      selection = null;
      setStatus('Selection released.');
      render();
    } else {
      selectBoard(cell);
    }
    return;
  }
  selection = null;
  setStatus(state.jewels[cell] === LEVEL.target[cell] ? 'That token is already aligned.' : 'Select a mismatched token.');
  render();
}

function tapShelfSlot(slot: number): void {
  if (selection?.kind === 'board') {
    const previous = selection;
    if (commit({ type: 'pickup', cell: previous.origin })) {
      keepSelection(previous);
      render();
    }
    return;
  }
  const colour = state.shelf[slot];
  if (colour == null) {
    selection = null;
    setStatus('Select a mismatched token.');
    render();
  } else if (selection?.kind === 'shelf' && selection.colour === colour) {
    selection = null;
    setStatus('Buffer selection released.');
    render();
  } else {
    selectShelf(colour);
  }
}

function tapShelf(): void {
  if (selection?.kind !== 'board') return;
  const previous = selection;
  if (commit({ type: 'pickup', cell: previous.origin })) {
    keepSelection(previous);
    render();
  }
}

function undo(): void {
  const previous = history.pop();
  if (!previous) return;
  state = previous;
  selection = null;
  winShown = false;
  winPanel.classList.remove('show');
  setStatus('Move undone.');
  render();
}

function restart(): void {
  state = createState(LEVEL, START_JEWELS);
  selection = null;
  history = [];
  winShown = false;
  winPanel.classList.remove('show');
  setStatus('Neural Matrix reset. Select a mismatched token.');
  render();
}

function hint(): void {
  const solution = solve(state);
  const action = solution.trace[0];
  if (!action) {
    setStatus(isWon(state) ? 'Alignment already certified.' : 'No certified route. Undo or restart.');
    return;
  }
  const cell = action.type === 'move' ? action.from : action.cell;
  const target = board.querySelector(`[data-cell="${cell}"]`);
  target?.classList.add('hint');
  window.setTimeout(() => target?.classList.remove('hint'), 2200);
  setStatus(action.type === 'place' ? 'Hint: choose this empty socket from the buffer.' : 'Hint: start with this token batch.');
}

function showWin(): void {
  if (winShown) return;
  winShown = true;
  setStatus('Alignment certified. Model online.');
  document.querySelector('#win-copy')!.textContent = `${state.moves} moves · all 64 tokens aligned · buffer clear`;
  window.setTimeout(() => winPanel.classList.add('show'), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900);
}

async function solveThroughUi(): Promise<boolean> {
  const solution = solve(state);
  if (!solution.solved) return false;
  const clearThroughUi = (): void => {
    if (selection?.kind === 'board') {
      const selectedCell = selection.cells.find((cell) => state.jewels[cell] === selection!.colour);
      if (selectedCell != null) tapCell(selectedCell);
    } else if (selection?.kind === 'shelf') {
      const selectedSlot = state.shelf.findIndex((item) => item === selection!.colour);
      if (selectedSlot >= 0) tapShelfSlot(selectedSlot);
    }
  };
  for (let index = 0; index < solution.trace.length; index++) {
    const action = solution.trace[index]!;
    const expected = reduce(state, action);
    if (!expected) {
      setStatus(`Certificate action ${index + 1} is no longer legal.`);
      return false;
    }
    if (action.type === 'pickup') {
      const alreadySelected =
        selection?.kind === 'board' && selection.cells.includes(action.cell);
      if (!alreadySelected) {
        clearThroughUi();
        tapCell(action.cell);
      }
      tapShelf();
    } else if (action.type === 'move') {
      const alreadySelected =
        selection?.kind === 'board' && selection.cells.includes(action.from);
      if (!alreadySelected) {
        clearThroughUi();
        tapCell(action.from);
      }
      tapCell(action.to);
    } else {
      const colour = state.level.target[action.cell]!;
      const slot = state.shelf.findIndex((item) => item === colour);
      if (!(selection?.kind === 'shelf' && selection.colour === colour)) {
        clearThroughUi();
        tapShelfSlot(slot);
      }
      tapCell(action.cell);
    }
    if (stateKey(state) !== stateKey(expected.state) || state.moves !== expected.state.moves) {
      setStatus(`UI route diverged at certificate action ${index + 1} (${action.type}).`);
      return false;
    }
    await new Promise((resolvePromise) => window.setTimeout(resolvePromise, 12));
  }
  return isWon(state);
}

shelf.addEventListener('click', tapShelf);
undoButton.addEventListener('click', undo);
document.querySelector('#hint')!.addEventListener('click', hint);
document.querySelector('#restart')!.addEventListener('click', restart);
document.querySelector('#win-restart')!.addEventListener('click', restart);
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h') hint();
  else if (event.key.toLowerCase() === 'r') restart();
  else if (event.key.toLowerCase() === 'z' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    undo();
  }
});

const testHook = {
  getState: (): GameState => state,
  getSelection: (): Selection | null => selection,
  getCertificate: (): Action[] => solve(state).trace,
  dispatch: (action: Action): boolean => commit(action),
  loadStateForTest: (next: GameState): void => {
    state = next;
    selection = null;
    history = [];
    winShown = false;
    winPanel.classList.remove('show');
    render();
  },
  restart,
  solveThroughUi,
};

declare global {
  interface Window { __swap: typeof testHook; }
}
window.__swap = testHook;

render();
