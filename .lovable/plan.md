# Two `/pi` tile fixes — SEVERE RADAR honesty + POWER OUTAGES battery gauge

## 1. SEVERE RADAR (tile 04) — currently shows nothing real

`<PiRadarSweep />` is decorative CSS only. No data source, no pins, no severity. Footer "iowa mesonet · live" is misleading.

### Recommended fix (no new edge function required)
Reuse the already-fetched **National Alerts** feed (`natAlerts` / `useNationalAlerts`) — same NWS endpoint we already poll. Plot pins on the radar for **Tornado / Severe Thunderstorm / Flash Flood Warnings** currently active, derive a count, and color/severity the tile by the count.

Specifically:
- Filter `natAlerts.data` to events whose `properties.event` matches `/^(Tornado Warning|Severe Thunderstorm Warning|Flash Flood Warning)$/i`.
- Count = `severeCount`.
- Pin placement on the radar: 6–10 dots randomly seeded by alert id (deterministic) inside the circle. Pure visual — we don't have the geometry budget to plot real lat/lon on a top-down radar at this tile size.
- Big value: `severeCount` (or `CLEAR` when 0).
- Severity: `red` if any Tornado Warning, `yellow` if any Severe T-storm / Flash Flood, else `green`.
- Footer: `${severeCount} active warnings · nws`.
- Keep the sweep animation behind the pins so it still feels alive.

This makes the tile actually informative and uses zero additional API calls.

### Files
- `src/components/PiViz.tsx` — extend `PiRadarSweep` to accept an optional `pins: Array<{angle: number; radius: number; color: string}>` and render them as glowing dots inside the existing radar circle.
- `src/pages/Pi.tsx` (tile 04) — compute `severeCount` + `pins` from `natAlerts`, pass to `<PiRadarSweep />`, add `<Big>` value, severity, and a real footer. Wire `status={natAlertsStatus}` so STALE pill works.

## 2. POWER OUTAGES (tile 10) — battery-style gauge

Replace the current "all-lit-or-all-empty" logic with a proportional fill modeled after your hatched-battery reference.

### Behavior
- Use `outageCust` against `outageData?.lawrence?.customersTracked` (the feed already returns this — currently ~37,575 for Lawrence County). Compute `pct = 1 - clamp(outageCust / customersTracked, 0, 1)`.
- 1 stack, ~14 cells, filled **bottom → top** so the gauge "drains" as outages rise.
- Color thresholds: green ≥ 80%, yellow ≥ 40%, red below.
- Add a subtle diagonal-hatch pattern on the lit cells (CSS `repeating-linear-gradient`) to match the reference look — without changing the existing PiCellStack signature, we add an optional `hatched?: boolean` prop.
- When `outagesStatus !== "ok"` or `outageUnavail`, render the gauge dim/empty (existing STALE pill already covers messaging).

### Visual layout in the tile
- Left: existing `<Big>` showing `outageCust.toLocaleString()` (or `—`).
- Right: a single taller battery (e.g. 32×96) instead of three 18×82 stacks — closer to the reference shape, more legible at distance.

### Files
- `src/components/PiViz.tsx` — add `hatched?: boolean` to `PiCellStack` (CSS pattern overlay on lit cells; non-breaking default off).
- `src/pages/Pi.tsx` (tile 10 body) — replace the three identical stacks with one taller stack whose `cells` are computed from `pct` (lit bottom-up), tone shifting green → yellow → red.

## Out of scope
- No layout/grid/tile-count changes.
- No new edge functions or data sources.
- Other tiles untouched.

## Open question
For SEVERE RADAR I'm proposing to reuse the national-alerts feed (cheapest, zero new requests). If you'd rather I pull a **real** severe-storm GIS layer (e.g., NWS active-warnings GeoJSON `/alerts/active?event=Tornado%20Warning,Severe%20Thunderstorm%20Warning`) and plot true geographic positions on a small US-centered radar, say so — that's a bigger change but more "real."
