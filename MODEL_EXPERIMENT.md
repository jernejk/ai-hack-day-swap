# AI Hack Day build experiment

This repository is the selected result of a two-model replication exercise.
Both builders started from written instructions rather than the original game
source.

## Process

1. **Sol (high reasoning)** inspected the canonical Jewel Swap game, wrote
   [PROMPT.md](PROMPT.md) and [ACCEPTANCE.md](ACCEPTANCE.md), then built a
   reference candidate.
2. **Fable** was asked for an adversarial prompt review. Its provider run
   returned no output and was cancelled cleanly, so no Fable-authored changes
   are represented here.
3. **Terra (medium reasoning)** received only the prompt and acceptance
   checklist. It independently produced a valid 4×4, five-action version,
   demonstrating that the instructions were sufficient for a smaller model.
4. The candidates were tested independently and played through the visible
   browser interface. Sol's 8×8, 20-action candidate was selected for its
   stronger puzzle depth, regression coverage, responsive polish, and motion.

## Selection evidence

| Candidate | Core tests | Browser tests | Certified solve | Result |
| --- | ---: | ---: | ---: | --- |
| Sol | 10/10 | 7/7 | 20 actions | Selected |
| Terra | 6/6 | 3/3 | 5 actions | Valid, simpler |

Release-blocking checks included first-tap selection without mutation,
eight-directional groups, colour-addressed buffer access, occupied-target
rejection, direct board routing, histogram preservation, explicit empty-buffer
win, and complete 360×740 layout.
