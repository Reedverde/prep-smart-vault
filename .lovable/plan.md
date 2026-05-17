## Power Outages — horizontal drain bar

Replace the vertical `PiCellStack` in the POWER OUTAGES · PA tile with a wide **horizontal** gradient bar that drains from the right as outages climb. Number sits left, bar fills the rest of the row. Only the visualization changes — number, label, footer, tile border, all other tiles stay untouched.

### Behavior

- Single named constant in `src/pages/Pi.tsx`:
  ```ts
  // Outage count at which the drain-bar reads fully empty. Tunable.
  const MAX_OUTAGES = 2500;
  ```
- `fillPct = clamp(0, 100, (1 - outages / MAX_OUTAGES) * 100)`
  - `outages = 0` → bar full (right edge at 100%)
  - `outages >= MAX_OUTAGES` → bar empty (0%)
- Bar is a horizontal track, clipped with the angled-corner `clip-path` from the reference, dark base `#03100f`.
- Fill is a horizontal gradient `red → yellow → green` (`#e24b4a 0%, #ef9f27 50%, #97c459 100%`) overlaid with 45° hatch `repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,0.28) 4px 9px)`.
- Bright 1px marker line at the right edge of the fill.
- Two corner brackets (top-left, bottom-right) colored by current severity zone:
  - `fillPct >= 67` → green (`var(--green)`)
  - `fillPct >= 33` → yellow (`var(--yellow)`)
  - else → red (`var(--red)`)
- When data unavailable, render bar empty.

### Layout

Inside the tile body, swap the current `flex` row to: big number (left, fixed min-width) + horizontal bar (right, `flex: 1`, ~30px tall). Big number sizing/coloring untouched.

### Implementation

1. Add `PiHDrainBar` component in `src/components/PiViz.tsx` (props `{ value, max }`), self-contained inline styles matching the reference HTML.
2. In `src/pages/Pi.tsx`:
   - Add `MAX_OUTAGES` constant near the other module-level constants.
   - Remove the now-unused `outageCells` / `outagePct` / `outageTracked` derivations.
   - Inside the POWER OUTAGES tile body, replace the `<PiCellStack ... />` with `<PiHDrainBar value={outageUnavail ? MAX_OUTAGES : outageCust} max={MAX_OUTAGES} />` wrapped so it takes `flex: 1`.

### Files touched
- `src/components/PiViz.tsx` — add `PiHDrainBar`.
- `src/pages/Pi.tsx` — add constant, swap component, drop dead derivations.

### Verification after commit
- Quote final bar JSX, `MAX_OUTAGES` definition, and fill-color logic.
- Confirm `outages = 0` → full bar (green); `outages >= 2500` → empty bar.
