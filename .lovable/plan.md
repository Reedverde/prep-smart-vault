## Goal

Upgrade the `/pi` operations dashboard from mostly text-only tiles to small embedded visualizations — dials, bars, sparklines, and a mini heat strip — without changing data sources or layout. Each tile keeps its current value/sub but gains a visual that reinforces the metric at a glance from across the room.

## Which tiles get what (and why)

These naturally map to a visual:

| # | Tile | Current | Proposed visual | Why |
|---|---|---|---|---|
| 03 | Air Quality | `47 · AQI good` | **Half-circle dial** 0–300 with EPA color zones, needle at AQI | AQI is a bounded scaled index — perfect dial use |
| 05 | Hazard Outlook | `LOW` | **3-segment bar** (clear / elevated / high) with active segment lit | Categorical, 3 levels |
| 06 | Fuel · Gasoline | `$3.42` | **Sparkline (already present)** + add tiny up/down arrow + Δ% bar | Already has spark — just emphasize trend |
| 07 | Financial Stress | `0.42` | **Horizontal centered bar** (–2 … +2) with marker at value, zero line | STLFSI is signed, centered around 0 |
| 08 | Nat'l Alerts | `1,247` | **Mini 5-bucket bar chart** of top event-type counts | Already aggregated by type |
| 09 | PJM Load | `42.1k · 78% of peak` | **Vertical % fill bar** + existing spark | "% of peak" begs for a fill gauge |
| 10 | Power Outages | `0` | **3-pip status row** (clear / localized / widespread) | Categorical severity |
| 11 | Conflict Pulse | `ELEVATED` | **Region heat strip** — 6-cell horizontal bar, one per world region, intensity = article count | Conflict has natural region distribution |
| 12 | Quakes 7d Max | `M4.2` | **Magnitude scale bar** 0–9 with marker | Bounded log scale, classic gauge |
| 14 | Internet Health | `OK · +2.1%` | **Centered delta bar** (–30% … +30%) with marker | Signed delta from baseline |
| 15 | Disasters Global | `12 · 2 red 4 orange` | **Stacked count bar** red/orange/green segments | Already has tiered counts |
| 16 | Space Wx · Kp | `Kp 3` | **9-cell Kp scale strip** (G1–G5 colors) with active cell lit | NOAA Kp is exactly a 0–9 cell scale |

Tiles intentionally **left text-only**: 01 Weather (already has WeatherIcon + moon), 02 Alerts (count + event text reads better), 04 Radar (placeholder), 13 Headlines (just a count), 17 System/Clock.

## Design constraints

- All visuals render in **phosphor green / amber / red** using existing `--pi-green`, `--pi-amber`, `--pi-red` CSS vars on `/pi` — no new tokens, no leaking into the rest of the app's design system.
- Each viz fits in the upper-right of the tile body (where `icon`/`spark` slot already lives) **or** as a thin strip directly under the big value, max 14–18px tall. The big value stays the hero — the viz is a sidekick.
- Pure inline SVG, no new dependencies. No animation beyond the existing alert pulse.
- Wide tiles (Conflict, Alerts, System) get a slightly larger viz (the conflict region heat strip needs the room).

## Technical plan

Add one new file: **`src/components/PiViz.tsx`** exporting small primitives:

- `PiDial` — half-circle gauge (zones + needle), used by Air Quality and Quake magnitude
- `PiSegmentedBar` — N discrete cells with one or more lit, used by Hazard Outlook, Outages, Kp
- `PiCenteredBar` — bipolar bar with zero line + marker, used by STLFSI and Internet delta
- `PiFillBar` — vertical or horizontal % fill, used by PJM Load
- `PiStackedBar` — proportional stacked counts, used by Disasters and Nat'l Alerts top-events
- `PiHeatStrip` — N cells colored by intensity, used by Conflict regions

Then update **`src/components/PiTile.tsx`** to accept an optional `viz?: ReactNode` prop, rendered in the same top-right slot as `icon`/`spark` (or just below value when wider).

Then in **`src/pages/Pi.tsx`**, attach the appropriate `viz` to each tile spec listed above using values already computed in the file (no new hooks, no new edge functions).

## Out of scope

- No data-source changes. No new edge functions. No layout reshuffle.
- No changes to `/dashboard` panels.
- Conflict region heat strip uses the existing `byRegion` object already on the conflict hook — no new fetch.
