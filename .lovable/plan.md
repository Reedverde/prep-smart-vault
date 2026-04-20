

# Park Stage 5 Plan in Memory

Save the Stage 5 Drive integration plan to a dedicated memory file and add a one-liner to the index so it's discoverable when we come back to it. No code changes, no execution.

## What gets saved

**New file: `.lovable/memory/features/stage-5-drive-plan.md`**
- Type: `reference` (it's a parked plan, not an active rule)
- Contents: the full Stage 5 plan as drafted — prerequisites, architecture diagram, DB changes, edge functions, frontend changes, security notes, files touched, secrets needed, out-of-scope list, and the 5a/5b split suggestion
- Header note at top: **STATUS: PARKED — do not implement until user re-initiates Stage 5. Current priority order: finish GDELT swap → verify 11 panels post-EIA-key → Stage 3 Snapshots → Stage 4 Alerts → Stage 5 Drive.**

**Updated: `.lovable/memory/index.md`**
- Add one line under Memories:
  `- [Stage 5 Drive (parked)](mem://features/stage-5-drive-plan) — Full Drive integration plan, on hold until Stages 3 & 4 ship`

## Why memory and not a repo scratch file

Memory is the right home: it's auto-surfaced when you mention "Stage 5" or "Drive integration" in a future message, whereas a `.md` file in the repo would just sit there. The plan stays out of the build and out of the way.

## Files touched

- `.lovable/memory/features/stage-5-drive-plan.md` (new)
- `.lovable/memory/index.md` (one-line addition)

## Out of scope

- Any Stage 5 implementation work
- Any changes to current GDELT swap
- Touching the active priority queue (3 → 4 → 5)

