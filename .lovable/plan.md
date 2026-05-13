## Goal

Beef up the seven specific tile visualizations the user called out so numbers, labels, and stroked lines are readable on the 1024×600 Pi screen.

## Changes

### `src/components/PiViz.tsx`

**1. PiHalfRing (AQI — image 1)**
- Arc `stroke` 7 → 11
- Needle `strokeWidth` 2 → 3, hub `r` 3 → 4.5
- Value text `fontSize` 16 → 26

**2. PiRadarSweep (image 2)** — uses CSS in `pi.css`
- `.pi-radar` border 2px → 3px
- `.pi-radar::before/::after` inner ring border 1 → 2px
- `.pi-radar-cross::before/::after` 2px → 3px
- `.pi-radar-center` 6 → 9px

**3. PiRingMeter (STLFSI — image 3)**
- `stroke` 7 → 12
- Center value `fontSize` 18 → 30
- `sublabel` `fontSize` 8 → 12

**4. PiMoon caption (image 4)** — in `src/pages/Pi.tsx`
- Inline text block next to PiMoon: `fontSize` 10 → 16, line-height stays

**5. PiShield + table (image 5)**
- Shield path `strokeWidth` 2 → 3.5
- In `Pi.tsx` ALERTS·LOCAL table: `fontSize` 9 → 14, `borderSpacing` 6px → 10px

**6. PiGlobe + legend (image 6)**
- Outer circle `strokeWidth` 1.25 → 2.5
- Equator + meridians + axis line `strokeWidth` 1 → 2
- In `Pi.tsx` DISASTERS legend: `fontSize` 10 → 16

**7. PiKpField (image 7)**
- Ellipse `strokeWidth` 1 → 2
- Center dot `r` 3 → 5
- "Kp N" label `fontSize` 14 → 22

### Out of scope

No layout, color, hook, or polling changes. No Tile/grid restructuring.

## Verification

After edits, screenshot `/pi` and crop each of the seven tiles to confirm the call-outs match the user's request.
