## Issue

Yellow, orange, red, purple, and blue tiles all get a bright colored 1px border that frames them like a complete box. Green tiles fall back to the dim `--chrome` border, so the box reads as faint/unframed even though the green corner brackets are there.

Look at `src/styles/pi.css`:
- Default `.pi-tile` has `border: 1px solid var(--chrome)` (line 241) — dim grey-green.
- Each severity override (`yellow`, `orange`, `red`, `purple`, `blue`) sets `border-color` to its bright color.
- There's no override for `green`, so green tiles keep the dim `--chrome` border.

## Fix

Add a single `.pi-tile[data-sev="green"] { border-color: var(--green); }` rule to `src/styles/pi.css`, alongside the existing severity overrides. The green corners + green border will now match the framing style of every other tile.

That's the entire change — no JSX, no other CSS.
