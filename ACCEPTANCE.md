# Neural Socket acceptance checks

## Behavioural contract

- [ ] Each playable cell always renders a square target socket under a smaller round current jewel; a mismatch exposes both colours.
- [ ] The initial board is full and the shelf is empty.
- [ ] Selecting a mismatched jewel selects its entire same-colour, mismatched 8-connected region, including diagonal connections.
- [ ] Selection alone changes no jewel, socket, shelf entry, capacity, move count, or undo history.
- [ ] Correctly seated jewels cannot be selected or lifted.
- [ ] Tapping the selected board batch again cancels it.
- [ ] With a board batch selected, tapping the shelf transfers only as many jewels as there are free shelf slots.
- [ ] With a board batch selected, tapping an empty matching target region moves directly board-to-board and does not change shelf contents.
- [ ] A direct move transfers exactly `min(source selected region, destination empty region)` and leaves corresponding source holes.
- [ ] After a partial board-to-board or shelf drop, remaining source jewels stay selected.
- [ ] Tapping any shelf jewel selects its colour; all jewels of that colour are considered available, regardless of physical slot order.
- [ ] A shelf pour fills only an empty, 8-connected matching target region and removes only the selected colour from its actual shelf positions.
- [ ] Shelf survivors compact visually without their logical colours changing.
- [ ] No action swaps with, overwrites, displaces, or auto-queues through an occupied destination.
- [ ] Completing a colour grants exactly 3 shelf slots once, capped at the level maximum.
- [ ] Win requires both every playable socket matched and shelf length zero.
- [ ] Undo restores the exact prior board, shelf, capacity, completion set, and move count.
- [ ] Restart restores the identical starting permutation and empty history.
- [ ] Hint identifies one legal action on a certified winning continuation without playing it.

## Solvability and generation

- [ ] The checked-in AI-themed level has internally consistent dimensions and at least three distinguishable colours.
- [ ] The starting jewel histogram equals the target histogram exactly, including masked cells remaining empty.
- [ ] The deterministic seed/permutation is stable across reloads.
- [ ] A solver returns a finite certificate for the shipped start.
- [ ] Replaying every certificate action through the production reducer yields no rejected action.
- [ ] Certificate replay ends with every socket matched and the shelf empty.
- [ ] At least one legal opening exists and the certified opening does not dead-end.
- [ ] Legal move enumeration never includes an occupied destination.

## Regression tests for the deployed deviations

These are release-blocking.

1. **Shelf is colour-addressed, not FIFO/queue-addressed**
   - Arrange shelf as `[cyan, violet, cyan]`.
   - Arrange an empty violet target region and no cyan destination requirement.
   - Select the middle violet shelf jewel, then tap the empty violet socket.
   - Expect violet to be placed, shelf to become `[cyan, cyan]`, and the cyan head to remain untouched.
   - Fail if the app insists on cyan, dequeues the first slot, or auto-forwards a queued batch.

2. **Occupied target is never a swap destination**
   - Select a cyan board batch.
   - Tap a cell whose target is cyan but whose current occupant is a mismatched violet jewel.
   - Expect board, shelf, moves, and history to remain byte-for-byte unchanged (selection may remain active).
   - Fail if cyan and violet swap, violet is displaced to the source/shelf/queue, or either cell is overwritten.

3. **The second tap, not the first, commits movement**
   - Snapshot state.
   - Tap a liftable batch once.
   - Expect the core snapshot to remain identical and only selection metadata/classes to change.
   - Tap shelf or an empty matching region.
   - Expect exactly one committed move and one history entry.

4. **Direct routing does not visit the queue**
   - Open a matching empty region.
   - Select a board batch and tap that region.
   - Expect shelf contents and order unchanged before versus after.

## Input and controls

- [ ] Tap/click is the only gesture required; drag is neither required nor interpreted as a move.
- [ ] Touch, pen, mouse, and keyboard users can operate all primary functions.
- [ ] Ctrl/Cmd+Z undoes, `H` hints, and `R` restarts.
- [ ] Board cells expose stable test ids/indices for deterministic automation.
- [ ] Controls remain responsive during presentation animation without allowing duplicate state commits.
- [ ] Invalid taps provide gentle, non-blocking visible and announced feedback.

## Animation and feedback

- [ ] Selection visibly lifts in 120–160 ms without changing logical position.
- [ ] Jewels travel on a shallow arc for roughly 340–420 ms.
- [ ] Batch movement is staggered, initially 70–85 ms and tapering toward 30–35 ms.
- [ ] Landings have a brief 100–160 ms squash/settle.
- [ ] Shelf survivors slide/compact in roughly 260–320 ms instead of teleporting.
- [ ] Colour completion produces a 1.2–1.6 s sweep tied to that colour and reveals 3 unlocked slots.
- [ ] Win produces a restrained 1.2–1.8 s motif reveal and then a usable completion panel.
- [ ] `prefers-reduced-motion: reduce` removes arcs, breathing, particles, and long sweeps; state updates remain immediate.

## Responsive layout

- [ ] At desktop size, the board remains the dominant element and the lab chrome stays secondary.
- [ ] At exactly 360×740, header, complete board, usable shelf, status, and Undo/Hint/Restart are visible with no horizontal scrolling.
- [ ] No shelf slot or required control is clipped at 360×740.
- [ ] Safe-area padding is included for installed/mobile browsers.
- [ ] Footer controls are at least 44 px high; the full cell/socket area is tappable.
- [ ] Repeated resize/orientation changes do not drift or progressively push the shelf off-screen.

## Accessibility

- [ ] Every board cell has an accessible name containing target colour and current jewel colour or “empty”.
- [ ] Selected cells and legal destinations expose state beyond colour alone.
- [ ] Each colour has a distinct glyph visible on jewels and target/empty cues.
- [ ] Keyboard focus is clearly visible.
- [ ] A polite live region announces committed moves, invalid destinations, colour completion/capacity growth, and win.
- [ ] Text and controls meet WCAG AA contrast against the workbench background.
- [ ] The game does not rely on sound, hover, drag, or animation to convey state.

## Visual fidelity

- [ ] Visual identity reads as a restrained AI Hack Day model lab: deep indigo/graphite, ion cyan/compute violet structure, compact utility labels, and faint circuit traces.
- [ ] It does not read as a generic SaaS dashboard: no stat-card grid, fake charts, fake model metrics, or oversized gradient headline.
- [ ] Socket/jewel distinction remains legible at phone size.
- [ ] Selected batch, offered shelf, legal empty regions, completed colour, locked/unlocked capacity, and win are visually distinct at a glance.
- [ ] There are no external-image dependencies, monetisation surfaces, timer, move limit, lives, energy, ads, or match-three swapping.
