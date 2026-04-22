

# Row layout — 3 wides, 17 tiles total

Going with your option 1: Alerts, Conflict, System/Clock as the 3 wides. Disasters becomes standard (still gets alert-pulse when red events fire).

Math: 3 wide × 2 + 14 standard × 1 = 20 cells = 5 cols × 4 rows ✓ → 17 total tiles.

I need to add **one extra standard tile** to hit 17. Adding **Hazardous Outlook** (`useHazardousOutlook`) — it's already a panel on the dashboard, distills cleanly to `NORMAL` / `ELEVATED`, and complements the Alerts/Radar weather cluster.

## Confirmed row layout

**Row 1 (5 cells):** Weather(1) · Alerts WIDE(2) · Air(1) · Radar(1)
**Row 2 (5 cells):** Hazard Out(1) · Fuel(1) · STLFSI(1) · Nat'l Alerts(1) · PJM Load(1)
**Row 3 (5 cells):** Outages(1) · Conflict WIDE(2) · Quakes(1) · Headlines(1)
**Row 4 (5 cells):** Internet(1) · Disasters(1) · Space WX(1) · NASA(1) · System/Clock WIDE(2)

Wait — row 4 = 1+1+1+1+2 = 6. Recounting:

**Row 4 (5 cells):** Disasters(1) · Space WX(1) · NASA(1) · System/Clock WIDE(2) = 5 ✓

So Internet moves up to row 3, and row 3 needs to drop one tile. Let me lay it out cleanly:

## Final corrected layout (verified cell-by-cell)

| Row | Tiles | Cells |
|---|---|---|
| 1 | Weather · **Alerts(wide)** · Air · Radar | 1+2+1+1 = 5 |
| 2 | Hazard Out · Fuel · STLFSI · Nat'l Alerts · PJM Load | 1+1+1+1+1 = 5 |
| 3 | Outages · **Conflict(wide)** · Quakes · Internet | 1+2+1+1 = 5 |
| 4 | Headlines · Disasters · Space WX · NASA · ~~too many~~ | needs fix |

Row 4 must end with the wide System/Clock. Final pass:

| Row | Tiles | Cells |
|---|---|---|
| 1 | Weather · **Alerts(wide)** · Air · Radar | 1+2+1+1 = **5** |
| 2 | Hazard Out · Fuel · STLFSI · Nat'l Alerts · PJM Load | 1+1+1+1+1 = **5** |
| 3 | Outages · **Conflict(wide)** · Quakes · Internet | 1+2+1+1 = **5** |
| 4 | Headlines · Disasters · Space WX · NASA · ~~System/Clock(wide)~~ | overflows |

Row 4 with a wide can only fit 3 standards + 1 wide = 5 cells. So row 4 = **Disasters · Space WX · NASA · System/Clock(wide)** = 1+1+1+2 = 5 ✓. That means **Headlines moves to row 3**, and row 3 sheds one tile.

## Final final layout (locked, 17 tiles, 20 cells)

| Row | Tile 1 | Tile 2 | Tile 3 | Tile 4 | Tile 5 | Cells |
|---|---|---|---|---|---|---|
| 1 | Weather | **Alerts** *(wide)* | Air | Radar | — | 5 |
| 2 | Hazard Out | Fuel | STLFSI | Nat'l Alerts | PJM Load | 5 |
| 3 | Outages | **Conflict** *(wide)* | Quakes | Headlines | Internet | 5 |
| 4 | Disasters | Space WX | NASA | **System/Clock** *(wide)* | — | 5 |

**Tile count: 17** (14 standard + 3 wide). **Cell count: 14 + 6 = 20** ✓.

## Tile inventory (locked, ordered by slot)

| # | Tile | Wide | Hook | Headline | Sub | Severity rule |
|---|---|---|---|---|---|---|
| 01 | Weather | — | `useWeather` | `{tempF}°F` | `{cond} · wind {n}mph` | info |
| 02 | NWS Active Alerts | ✓ | `useAlerts` | active count | `no active warnings · forecast office {x}` | 0 clear / moderate watch / severe alert |
| 03 | Air | — | `useAirQuality` | `{aqi}` | `AQI {category}` | <50 clear / 50–100 watch / >100 alert |
| 04 | Radar | — | `useSevereRadar` | `—` / `ACTIVE` | `no echoes` / `{n} cells` | echoes = watch |
| 05 | Hazard Out | — | `useHazardousOutlook` | `NORMAL` / `ELEVATED` | `routine` / `{n} hazards` | hazards present = watch |
| 06 | Fuel | — (spark) | `useEiaFuel` | `${gas.latest}` | `±$X.XX wow · PADD 1B` | `spike` = watch |
| 07 | STLFSI | — | `useFinancialStress` | `{value}` | `below avg stress`/etc | >0 watch / >1 alert |
| 08 | Nat'l Alerts | — | `useAlerts` (national) | count | `active US · {n} states` | <100 clear / 100–500 watch / >500 alert |
| 09 | PJM Load | — (spark) | `useGridStatus` | `{loadKMW}k` | `{pct}% of peak` | >85% watch |
| 10 | Outages | — | `usePowerOutages` | customers or `—` | `localized` / `widespread` / `unavailable` | from existing field |
| 11 | Conflict Pulse | ✓ (spark) | `useConflictPulse` | `LOW`/`ELEV`/`HIGH` | `{n} articles 7d · top: {kw} · {country}` | by tier |
| 12 | Quakes | — | `useEarthquakes` | `M{mag}` | `{region} · {h}h` | <4 clear / 4–6 watch / 6+ alert |
| 13 | Headlines | — | `useGlobalHeadlines` | item count | `last 6h` | info |
| 14 | Internet | — | `useInternetHealth` | `OK`/`DEGRADED` | `no anomaly` / details | degraded = watch |
| 15 | Disasters | — | `useActiveDisasters` | active count | `{n} red · {n} orange` | red = alert / orange = watch |
| 16 | Space WX | — | `useSpaceWeather` | `Kp {n}` | `quiet`/`unsettled`/`storm` | Kp<5 clear / 5–6 watch / 7+ alert |
| 17 | NASA | — | `useNasa` | next NEO `MM/DD` | `next NEO approach` | info |
| 18 | System :: Clock | ✓ | `useSystemHealth` + local clock | `HH:MM:SS` | `scanner LIVE · system OK · {date}` | OK info / DEGRADED watch |

18 entries listed but 17 tiles — System/Clock is one combined tile (slot 18 only). Recount: rows 1-4 = 4+5+5+4 = 18. One off.

Row 1 has 4 tile entries (Weather, Alerts-wide, Air, Radar) = 4 tiles.
Row 4 has 4 tile entries (Disasters, Space WX, NASA, System/Clock-wide) = 4 tiles.
Rows 2 + 3 = 5 + 5 = 10 tiles.
Total = 4 + 10 + 4 = **18 tiles**.

Cell math: 18 tiles, 3 wide → 15 standard + 3 wide × 2 = 15 + 6 = **21 cells**. Off by 1.

The actual constraint with 3 wides and 20 cells = **17 tiles** (14 standard + 3 wide). One row must have only 3 standards + 1 wide. I'll drop one tile.

**Cutting Hazard Out** (row 2 becomes 4 tiles). Hazardous Outlook info gets folded into the Alerts tile sub-line ("...· {n} hazards" when present).

## Corrected & verified final layout (17 tiles, 20 cells)

| Row | Tiles | Math |
|---|---|---|
| 1 | Weather · **Alerts(wide)** · Air · Radar | 1+2+1+1 = 5 |
| 2 | Fuel · STLFSI · Nat'l Alerts · PJM Load | 1+1+1+1 = **4** ✗ |

Row 2 with no wide must have 5 standards. I keep Hazard Out and **drop something else**. Options: drop Headlines, drop NASA, drop Internet.

Cleanest cut: **drop NASA** (lowest signal value of the three — next NEO date is informational fluff next to Internet/Headlines).

## TRULY FINAL layout (17 tiles, 20 cells, verified)

| Row | T1 | T2 | T3 | T4 | T5 | Cells |
|---|---|---|---|---|---|---|
| 1 | Weather | **Alerts** *(w)* | Air | Radar | — | 1+2+1+1 = **5** |
| 2 | Hazard Out | Fuel | STLFSI | Nat'l Alerts | PJM Load | 1+1+1+1+1 = **5** |
| 3 | Outages | **Conflict** *(w)* | Quakes | Headlines | Internet | 1+2+1+1+1 = 6 ✗ |

Row 3 with one wide can only hold 3 standards. Drop one from row 3.

**Drop Internet from row 3, move to row 4** in place of NASA-or-similar:

| Row | T1 | T2 | T3 | T4 | T5 | Cells |
|---|---|---|---|---|---|---|
| 1 | Weather | **Alerts** *(w)* | Air | Radar | — | 5 |
| 2 | Hazard Out | Fuel | STLFSI | Nat'l Alerts | PJM Load | 5 |
| 3 | Outages | **Conflict** *(w)* | Quakes | Headlines | — | 1+2+1+1 = 5 |
| 4 | Internet | Disasters | Space WX | **System/Clock** *(w)* | — | 1+1+1+2 = 5 |

**Total tiles: 4 + 5 + 4 + 4 = 17 ✓. Total cells: 5+5+5+5 = 20 ✓. Wides: 3 ✓.**

NASA is dropped entirely (out of scope for v1 of `/pi`; the dashboard still has it).

## What changed vs. previous plan

- 3 wide tiles instead of 4 (Alerts, Conflict, System/Clock)
- Disasters demoted to standard (still pulses red on alert severity)
- NASA dropped from `/pi` v1
- Hazardous Outlook added as standard tile
- Internet moves to row 4 to balance row 3

Everything else (visual spec, color tokens, frame, scanline overlay, ticker, animations, sparklines on Fuel/PJM/Conflict, files touched, acceptance checks) is unchanged from the previous plan.

