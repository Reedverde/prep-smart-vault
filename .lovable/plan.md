# Plan: Let /pi breathe at 1024×768

The current layout uses a flex column inside `100vh` (top strip 32px + flex grid + ticker 32px), so the grid already auto-fills whatever height the panel reports. At 1024×768 the grid area becomes ~704px (4 rows × ~176px) instead of ~528px (4 × 132px) at 1024×600. No structural changes needed — only typography and a couple of icons get scaled up so the extra vertical room is actually used.

## Changes

**`src/styles/pi.css`**
- `.pi-big-clock` — `font-size: 56px` → `72px`

**`src/pages/Pi.tsx`** — bump `<Big size=…>` and inline value sizes (~1.3× scale, keeping the existing relative hierarchy):

| Tile | Current | New |
|---|---|---|
| WEATHER `Big` | 32 | 42 |
| ALERTS LOCAL `Big` | 28 | 36 |
| NATIONAL `Big` | 26 | 34 |
| GRID `Big` (+ "MW" 11→14) | 26 | 34 |
| POWER OUTAGES `Big` (×2) | 32 | 42 |
| EARTHQUAKES `Big` | 22 | 30 |
| HEADLINES `Big` | 32 | 42 |
| INTERNET `Big` | 28 | 36 |
| Inline mono labels (fontSize 9/10/11 in tables, legends) | unchanged | unchanged |

Icon sizes already match the radar's 88px presence from the previous pass — leaving them as-is.

## Out of scope
- Grid template, tile count, severity logic, colors, copy.
- Hardcoding any pixel heights — layout stays `100vh` flex so it adapts to whatever the display reports.

## Verification
After the edit, navigate the preview to `/pi` at viewport **1024×768** and confirm: no scrollbars, no clipped values, grid rows visibly taller, clock fills its tile, then also spot-check 1024×600 to ensure nothing overflows there.
