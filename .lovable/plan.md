## Goal
Make the tile icons visually dominant — match the presence of `PiRadarSweep` (88×88) seen in `SEVERE RADAR`. In the photo, weather sun (42), shield (44), moon (48), hazard triangle (48) all look small/timid relative to radar.

## Changes (icon size bumps only — no layout/logic changes)

In `src/pages/Pi.tsx`:

| Tile | Current | New |
|---|---|---|
| `WEATHER` — `PiWeatherIcon` (line 369) | `size={42}` | `size={88}` |
| `ALERTS · LOCAL` — `PiShield` (line 380) | `size={44}` | `size={88}` |
| `MOON` — `PiMoon` (line 396) | `size={48}` | `size={88}` |
| `HAZARD OUT` — `PiHazardTriangle` (line 433) | `size={48}` | `size={88}` |
| `POWER OUTAGES` — `PiCellStack` (line 515) | review, scale up to ~88 tall if smaller |
| `DISASTERS` — `PiGlobe` (line 586) | `size={72}` | `size={88}` |
| `SPACE WX` — `PiKpField` (line 598) | `size={84}` | `size={88}` (already close) |

Quake/headlines/internet are charts (not icons) — leave alone.
Conflict pulse is a big text label — leave alone.

## Out of scope
- Tile sizes, grid layout, fonts, colors, copy.
- Charts and meters (only icon glyphs change).