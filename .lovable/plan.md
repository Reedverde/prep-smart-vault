

# Plan — 7 new panels (Phase 2 expansion)

Single commit. 3 new rows appended to the existing 4. Same grid system, same column-major layout, same proxy-via-edge-function pattern. Existing panels untouched.

## Row 5 — LOCAL WEATHER DEEP DIVE

| Position | Panel | Source | Refresh |
|---|---|---|---|
| Col 1 | Severe Radar | NEXRAD tiles (Iowa Mesonet), client-direct Leaflet overlay | 5 min |
| Col 2 | Hazardous Outlook | NWS HWO product via `nws-hwo` edge proxy | 30 min |
| Col 3 | Local Scanner | Broadcastify feed 33610, iframe→link fallback | static |

## Row 6 — MARKETS & INFRASTRUCTURE

| Position | Panel | Source | Refresh |
|---|---|---|---|
| Col 1 | Fuel Prices | EIA gasoline series via `eia-fuel` edge proxy | 60 min |
| Col 2 | Financial Stress | FRED STLFSI4 + VIX + T10Y2Y + MORTGAGE30US via `fred-stress` proxy | 60 min |
| Col 3 | Power Outages | FirstEnergy scrape + PA fallback via `power-outages` proxy | 5 min |

## Row 7 — INTERNET & COMMS

| Position | Panel | Source | Refresh |
|---|---|---|---|
| Col 1 | Internet Health | Cloudflare Radar API via `cloudflare-radar` proxy | 15 min |
| Col 2-3 | empty (row will visually leave 2 cols open at xl) | — | — |

Layout note: the existing row wrapper uses `xl:grid-cols-3 xl:auto-rows-fr`. A row with 1 panel will leave 2 empty grid cells — acceptable per spec ("leave 2 cols empty"). At `md` 2-col flow and mobile single-column, the panel just takes its natural slot.

## Edge functions (5 new)

All follow the existing proxy pattern (`@supabase/supabase-js/cors` headers, 503 + `{notConfigured: true}` when secret is missing, in-memory cache, JSON response).

### `nws-hwo`
- Input: `?lat&lng`
- Two-step: `api.weather.gov/points/{lat},{lng}` → extract `cwa` (forecast office) → `api.weather.gov/products/types/HWO/locations/{cwa}` → grab `@graph[0].id` → fetch full product text
- Parse: split on `.DAY ONE...`, `.DAYS TWO THROUGH SEVEN...`, `.SPOTTER INFORMATION STATEMENT...`
- Risk classifier on Day One: `tornado|damaging` → high · `severe` → elevated · `thunderstorm|wind` → watch · else clear
- Returns `{ office, issuedAt, dayOne: {risk, text}, extended, spotter, productUrl }`
- 30-min in-memory cache keyed by lat/lng rounded to 1 decimal
- Keyless

### `eia-fuel`
- Uses existing `EIA_APP_KEY`
- Two parallel fetches: Central Atlantic regular gasoline `EMM_EPMR_PTE_R10_DPG` and US average `EMM_EPMR_PTE_NUS_DPG`, 12 weeks each, weekly
- Compute: latest, week-over-week delta, 4-week pct change, spike flag (`>5% wow OR >10% 4w`)
- Returns `{ regional: {latest, prior, wow, fourWeekPct, series:[{period,value}]}, national: {latest}, spike: boolean, fetchedAt }`
- 1-hour cache
- Returns `{notConfigured:true}` 503 if EIA_APP_KEY missing

### `fred-stress`
- Needs new secret `FRED_API_KEY`
- 4 parallel fetches against `api.stlouisfed.org/fred/series/observations`: STLFSI4 (52w), VIXCLS (latest), T10Y2Y (latest), MORTGAGE30US (latest)
- Returns `{ stlfsi: {latest, level, series}, vix, yieldCurve, mortgage30, fetchedAt }` where `level` is one of low|below|normal|elevated|high
- 1-hour cache
- 503 + notConfigured if `FRED_API_KEY` missing

### `power-outages`
- No key. Defensive scrape.
- Strategy: try FirstEnergy's known JSON endpoint (`https://kubra.io/...` is the public CDN they use; we'll attempt `https://kubra.io/data/53cb8b13-7b2d-4a5e-9f10-...` style — exact URL discovered at runtime by hitting the FirstEnergy outage page and checking referenced JSON). Wrapped in try/catch.
- Fallback chain: FirstEnergy JSON → FirstEnergy HTML scrape (regex Lawrence County row) → return `{status:'unavailable', message, fallbackTriedAt}`
- Returns `{ status: 'ok'|'unavailable', lawrence: {customers, outages}, paTotal, topCounties: [{name, customers}], severity: 'clear'|'localized'|'widespread', source, scrapedAt }`
- 5-min cache
- Logs every failure for future tuning. Never throws.

### `cloudflare-radar`
- Needs new secret `CLOUDFLARE_RADAR_API_TOKEN`
- Auth: `Authorization: Bearer {token}` to `https://api.cloudflare.com/client/v4/radar/...`
- 3 parallel calls: `/radar/traffic/timeseries?dateRange=7d&location=US`, `/radar/attacks/layer7/summary?location=US`, `/radar/attacks/layer7/top/locations/target?location=US&limit=5`
- Returns `{ trafficDeltaPct, attackLevel: 'low'|'medium'|'high', topTargets, anomalyNote, fetchedAt }`
- 15-min cache
- 503 + notConfigured if token missing

## Hooks (5 new in `useDataSources.ts`)

`useNwsHwo(lat,lng,refreshMs)`, `useEiaFuel(refreshMs)`, `useFredStress(refreshMs)`, `usePowerOutages(refreshMs)`, `useCloudflareRadar(refreshMs)`.

All copy the existing pattern (project-id URL, anon-key headers, 503 → `{notConfigured:true}`, retry:1).

Severe Radar uses Leaflet directly (no hook). Scanner is a static component (no hook).

## Panels (7 new files)

All use the existing `Panel` shell from `src/components/Panel.tsx`, with `InfoTip` for explanations and the `notConfigured` dim "Configure {KEY} in secrets" state when applicable.

### `SevereRadarPanel.tsx`
Leaflet map, 280px, CartoDB Dark Matter base, NEXRAD tile overlay at opacity 0.7 from `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png`. Centered on user lat/lng, zoom 7. Cache-bust the tile layer URL every 5 min by remounting with a `key={Math.floor(Date.now()/300_000)}`. Primary-color CircleMarker for user location.

### `HazardousOutlookPanel.tsx`
Risk pill (clear/watch/elevated/high colored via severity tokens), Day One sentence, 7-day extended summary truncated cleanly at 500 chars on word boundary, spotter notice if active. "Last issued {timeAgo}" footer.

### `FuelPricesPanel.tsx`
Big regional price, WoW delta colored, national avg subline, 12-week sparkline (Recharts), spike warning banner when `spike: true`.

### `FinancialStressPanel.tsx`
Big STLFSI value + colored level pill, 52-week sparkline, 3-row mini table (VIX / Yield curve / 30Y mortgage). Caption "Above 0 = above-average stress."

### `PowerOutagesPanel.tsx`
Status banner colored by severity. Lawrence County big number, PA total below, top-5 affected counties list. Graceful "Outage data temporarily unavailable" dim banner when `status==='unavailable'`.

### `InternetHealthPanel.tsx`
Traffic delta vs 7d avg, attack level pill, top targets list, anomaly note when present, link out to Cloudflare Radar dashboard.

### `ScannerAudioPanel.tsx`
Channels list + iframe attempt (Broadcastify mobile player URL). On iframe load failure (timeout 3s with `onLoad` not firing → unlikely to detect cleanly; better: skip iframe and go straight to button per their X-Frame-Options policy). Render large "▶ TUNE IN" button linking new tab to `https://www.broadcastify.com/listen/feed/33610`. Static panel, no refresh.

## Dashboard wiring (`Dashboard.tsx` + `Live.tsx`)

Append 3 entries to the `groups` array in both files (identical wiring):

```ts
{ label: "LOCAL WEATHER DEEP DIVE", panels: [
  <SevereRadarPanel key="radar" lat={lat} lng={lng} refreshMs={5*60_000} />,
  <HazardousOutlookPanel key="hwo" lat={lat} lng={lng} refreshMs={30*60_000} />,
  <ScannerAudioPanel key="scanner" />,
]},
{ label: "MARKETS & INFRASTRUCTURE", panels: [
  <FuelPricesPanel key="fuel" refreshMs={60*60_000} />,
  <FinancialStressPanel key="fred" refreshMs={60*60_000} />,
  <PowerOutagesPanel key="outages" refreshMs={5*60_000} />,
]},
{ label: "INTERNET & COMMS", panels: [
  <InternetHealthPanel key="cf" refreshMs={15*60_000} />,
]},
```

The grid logic already handles partial rows (the 3rd row's single panel gets col 1; cols 2-3 stay empty at xl).

## Secrets

Already present: `EIA_APP_KEY`. Two new secrets needed before functions return live data:

- `FRED_API_KEY` — user grabs from https://fred.stlouisfed.org/docs/api/api_key.html
- `CLOUDFLARE_RADAR_API_TOKEN` — user generates from Cloudflare dashboard with Radar:Read permission

Functions ship deployable; missing secrets → 503 → panel renders "Configure {KEY} in secrets" dim state. No crashes, no blocks on other panels.

## Files touched

**New panels (7):** `SevereRadarPanel.tsx`, `HazardousOutlookPanel.tsx`, `FuelPricesPanel.tsx`, `FinancialStressPanel.tsx`, `PowerOutagesPanel.tsx`, `InternetHealthPanel.tsx`, `ScannerAudioPanel.tsx`

**New edge functions (5):** `nws-hwo`, `eia-fuel`, `fred-stress`, `power-outages`, `cloudflare-radar`

**Edited:** `src/hooks/useDataSources.ts` (5 new hooks), `src/pages/Dashboard.tsx` (3 new groups), `src/pages/Live.tsx` (3 new groups), `mem://features/dashboard-panels` (update for 19-panel structure), `mem://features/new-panels-phase-2` (new — sources, secrets, scrape risk notes), `mem://index.md` (add reference)

## Acceptance

- [ ] All 7 panels mount without throwing, regardless of secret state
- [ ] Severe Radar shows live NEXRAD tiles centered on user location
- [ ] Hazardous Outlook parses Day One risk + extended narrative + spotter status
- [ ] Fuel Prices renders price, WoW delta, sparkline, spike banner when applicable
- [ ] Financial Stress renders STLFSI value + level pill + 52w sparkline + 3-row indicator table
- [ ] Power Outages renders Lawrence/PA counts OR graceful "unavailable" banner
- [ ] Internet Health renders US traffic delta + attack level + top targets
- [ ] Scanner shows channels list + functional Tune In button (and iframe attempt where allowed)
- [ ] Missing FRED/Cloudflare secrets surface "Configure {KEY}" state, do not block sibling panels
- [ ] Existing 12 panels render identically to before
- [ ] Layout: 7 new panels arranged across 3 new rows, identical to the existing grid behavior at md/xl/mobile

## Out of scope

Historical baselines · grid regions map · existing panel reordering · making the row 7 single panel span all 3 columns (spec says leave 2 empty) · auto-detecting iframe block for Broadcastify (going straight to button is more reliable)

## Notes after approval

I'll deploy edge functions immediately so we can verify 503s for the not-yet-configured secrets, then ping you to add `FRED_API_KEY` and `CLOUDFLARE_RADAR_API_TOKEN` whenever ready. Power-outages scrape may need a follow-up tuning pass once we see what FirstEnergy actually returns — the panel will show its dim "unavailable" state until then, no crash.

