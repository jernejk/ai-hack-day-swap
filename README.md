# Neural Socket

A compact AI Hack Day version of Jewel Swap. It was built from the standalone
instructions in [PROMPT.md](PROMPT.md), with release gates in
[ACCEPTANCE.md](ACCEPTANCE.md).

```sh
npm ci
npm run dev
npm test
npm run build
npm run e2e
```

The shipped **Neural Matrix** level is a deterministic 8×8, four-colour derangement. `src/solver.ts` certifies it against the same pure reducer the UI uses. The browser exposes `window.__swap` for inspection, deterministic restart, certificate replay, and end-to-end UI solving.

## How to play

1. Tap a mismatched round token to select its complete connected colour group.
   Diagonals count.
2. Tap the context buffer to store the selected group, or tap a matching
   **empty** socket to route it directly.
3. Tap any token colour in the buffer, then tap a matching empty socket region
   to pour that colour. The buffer is colour-addressed, not a queue.
4. Correct tokens cannot be lifted, and occupied sockets can never be replaced
   or swapped.
5. Align every token and empty the buffer to win. Completing a colour unlocks
   three additional buffer slots.

Undo is unlimited. Hint shows the first action in a certified winning
continuation. Restart restores the same deterministic puzzle.

This is deliberately a focused POC: no backend, persistence, external images,
telemetry, accounts, timers, or monetisation.
