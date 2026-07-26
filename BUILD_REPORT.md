# Neural Socket build report

## Outcome

Built a fresh, local-only browser candidate in `app/` from `PROMPT_DRAFT.md`. It implements the reference loop rather than the deployed queue/swap deviation:

- a target socket remains visible under every smaller round jewel;
- first tap selects an 8-connected mismatched same-colour batch without mutating game state;
- second tap commits to either the shelf or a matching **empty** target region;
- direct board-to-board routing leaves the shelf unchanged;
- shelf pours are selected by colour, including a non-front colour;
- partial drops retain the remaining selection;
- correct jewels cannot be lifted;
- occupied targets never swap, overwrite, displace, or queue;
- each newly completed colour grows capacity by 3;
- win explicitly requires every socket matched **and** an empty shelf.

The hand-authored **Neural Matrix** level is an 8×8 four-colour braided circuit pattern. Its fixed starting colour-cycle preserves the target histogram exactly. The bounded solver produces and replays a 20-move legal certificate.

## Files

- `PROMPT.md` — self-contained smaller-model build prompt, including mechanics, styling, motion timings, accessibility, and exclusions.
- `ACCEPTANCE.md` — exact behavioural, solver, interaction, motion, responsive, accessibility, and visual checks; queue/FIFO and occupied-swap regressions are release-blocking.
- `app/src/core.ts` — pure regions, legality, reducer, capacity, and win condition.
- `app/src/level.ts` — authored Neural Matrix target and deterministic histogram-preserving start.
- `app/src/solver.ts` — bounded certificate solver/hint source.
- `app/src/main.ts` — selection state, real input handlers, history, animation effects, feedback, and `window.__swap`.
- `app/src/style.css` — model-lab visual system, responsive layout, physical cues, and reduced-motion mode.
- `app/tests/core.test.ts` — reducer/solver invariants.
- `app/tests/e2e/play.spec.ts` — real Chromium clicks, regressions, full UI solve, and responsive checks.
- `app/README.md` — run instructions and POC scope.

## Verification

Run from this repository root.

| Command | Result |
|---|---|
| `npm test` | **10/10 unit tests passed** in 250 ms. Includes 8-connectivity, correct-piece exclusion, direct routing, no occupied swap, non-front shelf colour, +3 growth, explicit empty-shelf win, histogram equality, and certificate replay. |
| `npm run build` | **Passed**: TypeScript clean; Vite built 7 modules. Output: HTML 2.42 kB, CSS 8.31 kB, JS 14.79 kB (5.41 kB gzip). |
| `npm run e2e` | **7/7 Playwright tests passed** in 10.9 s. Real UI selection/commit, partial shelf selection persistence, occupied-target rejection, non-front colour pour, full certified UI solve, 360×740 layout, and 1280×900 layout. |
| `npx playwright test --grep "desktop layout" --reporter=line` | **Passed** after the final visual-screenshot wait; board measured over 400 px, centred, with shelf below and controls in view. |

The requested in-app browser surface was not available in this worker session, so browser verification used the installed real Chromium through Playwright. No source-state mutation or test hook was used for the full solve itself: `solveThroughUi()` translates the certificate into the same cell and shelf handlers used by pointer clicks, and checks after every action that the UI route matches the production reducer.

## Screenshots inspected

- `app/artifacts/neural-socket-initial-360x740.png` — complete mobile start; board, 20-slot buffer, status, and controls are all inside the 360×740 viewport.
- `app/artifacts/neural-socket-initial-desktop-final.png` — centred desktop board and restrained lab chrome at 1280×900.
- `app/artifacts/neural-socket-selected.png` — selected batch lift/glow and active buffer state.
- `app/artifacts/neural-socket-win.png` — completed motif behind the restrained “Model online” reveal.

## Fidelity assessment

Core-loop fidelity is high for this bounded POC. The important semantic edge cases match the canonical reference and have both pure and real-UI coverage. State is authoritative and animation-only effects cannot alter solver behaviour. Selection and empty-destination cues remain legible at phone size, glyphs carry colour information, and the model-lab theme is specific without turning into fake dashboard furniture.

The physical feel is credible but smaller in scope than the production reference: CSS/WAAPI supplies shallow travel arcs, tapered staggering, settle, selection lift, shelf compaction through DOM reflow, completion sweep, capacity unlock, and win reveal, but there is no synthesised audio, vibration, gallery, level pack, persistence, PWA/offline support, image-to-level pipeline, or calibrated difficulty score. The authored level is an abstract neural matrix rather than recognisable pixel art, and its deterministic colour-cycle is intentionally easier to audit than a dispersed procedural scramble. Those omissions are appropriate to a compact Hack Day candidate, but they are the main fidelity gap if this proceeds beyond a POC.

No deploy, publish, repository creation, or edits outside `sol/` were performed.
