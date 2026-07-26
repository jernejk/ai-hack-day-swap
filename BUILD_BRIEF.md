# Hack Day Swap — minimal build brief

Build a tiny browser game that demonstrates the AI-assisted process of going
from an idea to a playable result. Recreate the core loop of Jewel Swap, not its
production architecture.

## Deliverable

- Put everything in `index.html`: markup, CSS, and plain JavaScript.
- Add a short `README.md` with only how to run and how to play.
- Use no framework, packages, build step, backend, images, or external fonts.
- The game must work from a local HTTP server on desktop and a phone-sized
  viewport.

## The game

Each board cell has:

```js
{ target: "purple", piece: "pink" } // piece may be null
```

The target is always visible as the square socket. The current piece is a
smaller glossy shape on top.

Use this interaction:

1. Tap a piece to select its 8-connected group of same-coloured pieces.
2. Tap the tray to move as many selected pieces as will fit into it.
3. Tap an empty socket with the same target colour to fill that
   8-connected target region from the selected group or tray.
4. Keep any unplaced remainder selected so it can fill another region.
5. Win when every piece colour matches its socket and the tray is empty.

Correctly placed pieces may not be lifted. Invalid taps should give a short
shake, not an alert.

Keep the puzzle forgiving:

- One hand-authored 11×11 target whose solved image is a friendly AI robot face.
- Five colours with visibly different values as well as hues.
- A deterministic, colour-preserving starting permutation.
- Tray capacity of 12.
- If the fixed starting board proves awkward, change the permutation until it
  is demonstrably solvable; do not add a solver or generator.
- Include only Restart and New shuffle controls, plus a move count.
- No timer, score, hints, sound, settings, persistence, levels, or failure state.

## Visual direction

Use the Brisbane AI Hack Day identity as the reference:

- `stage`: `#09090d`
- `panel`: `#17131f`
- `ultraviolet`: `#5b21b6`
- `electric purple`: `#8b5cf6`
- `magenta`: `#d946ef`
- `SSW red accent`: `#cc4141`
- `white`: `#f7f7fb`
- `muted`: `#aaa4b5`

Typography should be bold, condensed-looking system sans serif for the title,
with small uppercase utility text elsewhere. The page should feel like a live
hack-day stage: dark, high contrast, slightly industrial, and playful.

The board pieces are AI tokens, not jewels. Give each colour one simple
CSS-drawn or text glyph motif such as a neural node, spark, chip, brackets, or
bot eye. Do not use emoji or image assets.

Layout:

```text
AI HACK DAY · MINI BUILD
HACK DAY SWAP                 MOVES 0

          11×11 board

      temporary memory tray

       Restart   New shuffle
```

The board and tray must fit without horizontal scrolling at 360×740. Use
responsive CSS and pointer events. Respect `prefers-reduced-motion`.

## Acceptance check

- Opening the page shows a scrambled robot face and an empty 12-slot tray.
- A first tap selects pieces but does not move them.
- A second tap on the tray moves them and exposes target sockets.
- Matching empty sockets accept the selected colour; non-matching sockets do not.
- Restart restores the same shuffle; New shuffle produces another
  colour-preserving permutation.
- The level can be completed manually.
- The completed board clearly reads as an AI robot and shows a small win panel.
- No console errors at desktop and 360×740 viewports.
