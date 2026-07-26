# Build prompt: Neural Socket

Build a compact, polished browser proof-of-concept called **Neural Socket**: a calm colour-permutation puzzle themed for an AI Hack Day. It should feel like arranging luminous model tokens on a physical lab workbench, not like a generic analytics dashboard or a match-three game.

Use TypeScript, Vite, semantic HTML/CSS, and a small pure game core. Prefer DOM/CSS for this POC so the board remains inspectable and accessible. Use Vitest for core tests and Playwright for a few real-browser interaction checks. Do not add a backend, accounts, monetisation, timers, move limits, lives, energy, ads, analytics, external images, a component framework, or a large state library.

## The non-negotiable game model

Every playable board cell has two independent facts:

- A **square target socket** underneath, permanently visible, whose colour is the colour required at that coordinate.
- A **round jewel/token** above it, whose colour is the current occupant, or no jewel if the socket is empty.

A round jewel must be smaller than its square socket so the socket remains visible as a coloured frame. A mismatch therefore reads as two colours in one cell. A matching jewel/socket should visually merge into a calm, nearly solid tile.

The board begins completely occupied. Its jewel-colour histogram must exactly equal the target-colour histogram. The starting arrangement must be deterministic and must ship with a replayable legal winning certificate (or be produced by a deterministic solver/generator that verifies one before exposing the level).

Interaction is explicitly **select, then choose a destination**:

1. Tapping a mismatched jewel selects its complete **8-connected** (horizontal, vertical, or diagonal) region of same-coloured, mismatched jewels. Correctly seated jewels are not part of a selectable region and can never be lifted.
2. Selection does **not** change the board, shelf, move count, history, or empty cells. The chosen jewels only rise visually. Show all currently legal destinations.
3. A selected board batch can be sent to:
   - the shelf/tray, which accepts as many jewels as its free slots allow; or
   - an **empty** 8-connected target region of the same colour, moving directly board-to-board without touching the shelf.
4. Direct board-to-board placement moves `min(selected batch size, destination empty-region size)` jewels. The vacated source cells become empty. If only part of the selected batch moved, the remaining source jewels stay selected so the player can feed more matching empty regions without reselecting.
5. Tapping the shelf while a board batch is selected moves up to the shelf’s free capacity. A partial shelf drop must leave the untransferred source jewels selected.
6. Tapping a shelf jewel selects that **colour**, not that physical slot and not “the queue head”. Tapping any empty matching target region then pours up to the smaller of (a) that region’s size and (b) the total count of that colour anywhere on the shelf. Remove those colour jewels from their actual shelf positions and compact the survivors. A non-front shelf colour is always usable.
7. A destination must be empty. Never swap with, overwrite, displace, queue, or auto-forward an occupied jewel—even if that occupied cell’s target colour matches the selected jewel.
8. Tapping a correct jewel is a no-op with gentle feedback. Tapping the selected batch again cancels selection. Tapping elsewhere may select another liftable batch or clear selection.

Use breadth-first wavefront order from the tapped cell for deterministic partial batches and visual staggering. Core actions may be:

```ts
type Action =
  | { type: 'pickup'; cell: number }               // board batch -> shelf
  | { type: 'place'; cell: number }                // selected shelf colour -> empty region
  | { type: 'move'; from: number; to: number };    // board -> board
```

Keep selection as UI state layered over the pure core. The core changes immediately when a legal action is committed; animation only depicts the already-committed result.

## Capacity, progress, and ending

- Give the shelf an explicit initial capacity, visible future locked slots, and a maximum capacity.
- When every target cell of one colour is correctly filled, that colour completes exactly once and shelf capacity grows by **3 slots** (up to the maximum).
- Make the reward legible: a restrained light sweep through that colour, a few particles, and the newly earned slots unlocking in sequence.
- The game is won only when **every playable socket contains its target colour and the shelf is empty**. Check both conditions explicitly.
- There is no loss screen. If no move is proven, guide the player toward Undo or Restart.
- Undo is unlimited and restores the exact prior core state. Restart restores the same deterministic certified scramble. Hint highlights the first step of a known winning continuation; it does not silently play it.

## Level and solvability

Include at least one hand-authored AI-themed level (for example a neural matrix, inference core, chip, or connected-node glyph) with 3–5 clearly separable colours and optional masked cells. Keep it small enough for a 360×740 phone.

For the starting state:

- preserve the target histogram exactly;
- avoid accidental occupied-target swaps as a “shortcut”;
- use a fixed seed or checked-in permutation;
- run the same pure reducer used by the player over the winning certificate in a unit test;
- assert every certificate step is legal, final sockets all match, and final shelf is empty.

A compact greedy-plus-bounded-backtracking solver is appropriate: greedily take safe pours and direct board moves, and branch only over which mismatched region goes to the shelf. Exact optimal search and a production image-to-level pipeline are out of scope.

## Visual direction

Use a restrained **AI Hack Day model-lab** identity:

- deep indigo/graphite workbench;
- crisp off-white text;
- ion cyan and compute violet as structural accents;
- the level’s jewel colours provide the remaining chroma;
- a small utility label such as `MODEL ALIGNMENT / LAB 03`, a monospace status readout, and faint circuit traces may establish context, but avoid fake metrics and decorative dashboard cards.

The board is the hero. Keep the header and controls quiet. Use no external art. A subtle local CSS grain or circuit-line background is acceptable if it does not compete with the sockets.

Physical polish should be visible but bounded:

- selection lift: 120–160 ms, about 1.08× scale, stronger cast shadow, slight breathing;
- travel: 340–420 ms per jewel on a shallow curved arc;
- batch stagger: start near 70–85 ms and taper toward 30–35 ms for long groups;
- arrival: 100–160 ms squash/settle;
- shelf compaction: about 260–320 ms;
- colour completion sweep: about 1.2–1.6 s;
- capacity slots: staggered 60–90 ms unlocks;
- win reveal: about 1.2–1.8 s, closing socket gaps and revealing the completed AI motif with a restrained particle burst.

Do not block input for the full animation. Prevent duplicate actions from corrupting state, but keep the pure state authoritative.

When `prefers-reduced-motion: reduce` is active, remove travel arcs, breathing, particles, and long sweeps; commit state immediately and use brief opacity/outline changes only.

## Responsive input and accessibility

The complete board, shelf, status, and primary controls must fit without horizontal scrolling at both a normal desktop viewport and **360×740**. Reserve shelf space before sizing the board. Account for safe-area insets. Use pointer/click input that works for touch, pen, and mouse; do not require drag. Keep footer controls at least 44 px high and make the whole socket cell the tap target.

Provide visible keyboard focus. Support Undo with Ctrl/Cmd+Z, Hint with `H`, and Restart with `R`. Add labels that expose target colour, current jewel colour/empty state, selected state, and legal destination state. Use distinct glyphs on jewel colours and target cues so colour is not the only signal. Announce moves, capacity growth, invalid destinations, and the win through a polite live region.

## POC architecture and test hook

Keep architecture proportional:

```text
src/core.ts       pure types, 8-neighbour regions, legality, reducer, win
src/level.ts      one authored target, deterministic scramble, certificate
src/solver.ts     small bounded solver and hint
src/main.ts       selection/input/history/render glue and test hook
src/style.css     layout, visual states, motion, reduced motion
```

Expose a deliberate test hook such as:

```ts
window.__swap = {
  getState(),
  getSelection(),
  getCertificate(),
  dispatch(action),
  restart(),
  solveThroughUi()
}
```

Automated coverage must include 8-connectivity, select-without-mutation, correct pieces not liftable, partial board and shelf drops preserving selection, board-to-board movement leaving the shelf unchanged, shelf colour selection independent of slot order, rejection of occupied-target placement/swaps, histogram preservation, growth by 3, explicit empty-shelf win, undo/restart, and certificate replay.

Add Playwright checks for a real two-tap opening, choosing a non-front shelf colour, an attempted occupied-target drop that leaves state unchanged, a full legal UI solve, and the 360×740 layout.
