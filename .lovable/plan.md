

# Wire 3 Panels into Dashboard + State Code Parsing

Single-file code change to `src/pages/Dashboard.tsx`, plus a memory update. No visual QA — ship default layout.

## State code helper (in `Dashboard.tsx`)

`resolveStateCode(locationName: string | null): string | null`

1. Regex `/,\s*([A-Z]{2})\s*$/i` against `location_name`. If match and code is in valid US states set (50 + DC), return uppercased.
2. Otherwise, take last comma-segment, lowercase, look up in inline full-name map (`{ pennsylvania: "PA", ohio: "OH", ... }` for all 50 + DC).
3. Otherwise return `null` (NewsPanel falls back to national-only).

Pass to `<NewsPanel state={stateCode} refreshMs={refreshMs} />`.

## Grid layout (default — Global wide)

```text
xl 3-col:
Row 1: Weather        Alerts          Earthquakes
Row 2: Space Wx       NASA            Air Quality
Row 3: Grid Status    National        News
Row 4: Global (col-span-2)            System Health
```

Mobile single-column order:
Alerts → Weather → Earthquakes → Space Wx → NASA → Air Quality → Grid Status → National → News → Global → System Health

Use `order-N md:order-N xl:order-N` classes on each panel wrapper to control responsive ordering, matching the existing pattern in `Dashboard.tsx`.

## Memory update

Rewrite `mem://features/dashboard-panels` to list 11 panels with their data sources and proxy edge functions:

- Weather (Open-Meteo, direct)
- Alerts (NWS, direct)
- Earthquakes (USGS, direct)
- Space Weather (NOAA SWPC, direct — Kp parsing hardened)
- NASA (DONKI + NEO via `nasa-space` proxy)
- Air Quality (AirNow via `airnow-observations` proxy)
- Grid Status (EIA PJM via `eia-grid` proxy)
- National (RSS, direct)
- News (NewsAPI + RSS via `news-feed` proxy, state-filtered)
- Global (GDACS direct + ACLED via `acled-events` OAuth proxy)
- System Health (internal)

## Files touched

- `src/pages/Dashboard.tsx` — add 3 imports, state code helper, render 3 panels with responsive ordering
- `mem://features/dashboard-panels` — updated panel inventory (11 panels)

## Out of scope (confirmed)

- Stage 3 snapshots
- Stage 4 alert delivery
- Edge function changes
- Settings page changes
- Visual QA (you'll eyeball it post-ship)

