---
name: Dashboard Panels
description: Specifications for the live dashboard panels and their data sources
type: feature
---

# Dashboard Panels (12 total)

Rendered in `src/pages/Dashboard.tsx` as a CSS-columns masonry (`columns-1 md:columns-2 xl:columns-3`), column-major fill. Each panel wrapped in `break-inside-avoid mb-4`. All third-party API keys live as Cloud Secrets and are proxied through Supabase Edge Functions (see `mem://architecture/api-security-model`).

## Panels

| Panel | Component | Data source | Access |
|---|---|---|---|
| Weather | `WeatherPanel` | Open-Meteo / NWS | Direct (no key) |
| Alerts | `AlertsPanel` | NWS api.weather.gov | Direct (no key) |
| Earthquakes | `EarthquakesPanel` | USGS earthquake feed + Leaflet map (CartoDB Dark Matter tiles) | Direct (no key) |
| Space Weather | `SpaceWeatherPanel` | NOAA SWPC Kp + live SDO 193Å sun image | Direct (no key) |
| NASA | `NasaPanel` | DONKI flares/CMEs + NEO close approaches | `nasa-space` proxy (NASA_API_KEY) |
| Air Quality | `AirQualityPanel` | AirNow observations | `airnow-observations` proxy (AIRNOW_API_KEY) |
| Grid Status | `GridStatusPanel` | EIA PJM demand + fuel mix + 24h trend | `eia-grid` proxy (EIA_APP_KEY) |
| Energy & Supply Costs | `EnergyCostsPanel` | EIA (gasoline/diesel/natgas/heating oil) + Freightos FBX | `eia-fuel` + `freightos-fbx` proxies |
| National | `NationalPanel` | RSS aggregation | Direct |
| Global Headlines | `GlobalHeadlinesPanel` | GDELT artlist 6h, English-only, server-classified tags. Scrollable (max-h ~500px). | `gdelt-headlines` keyless proxy |
| Conflict Pulse | `ConflictPulsePanel` | GDELT 7d conflict/protest aggregation. Index label + count + top region/theme. | `gdelt-events` keyless proxy |
| Active Disasters | `ActiveDisastersPanel` | GDACS Orange/Red active events list. | GDACS direct |
| System Health | `SystemHealthPanel` | Internal (refresh interval, source status) | Internal |

## Layout (12-panel masonry, column-major)

xl 3-col:
- Col 1: Alerts · Weather · Earthquakes · ConflictPulse
- Col 2: SpaceWeather · AirQuality · National · ActiveDisasters
- Col 3: GridStatus · NASA · GlobalHeadlines · SystemHealth

md 2-col: same JSX order, fills 2 columns column-major.

Mobile single-column: Alerts → Weather → Earthquakes → ConflictPulse → SpaceWeather → AirQuality → National → ActiveDisasters → GridStatus → NASA → GlobalHeadlines → SystemHealth.

## Sun image (Space Weather)

- 120×120 rounded `<img>` above the Kp gauge
- Source: `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg?b={bucket}` where `bucket = floor(Date.now() / 600_000)` (cache-buster ticks every 10 min; SDO updates ~12 min)
- Caption: "Sun now · 193Å · NASA SDO"
- `onError` → `setSunFailed(true)` hides the entire image block; the rest of the panel (gauge, trend, implications) still renders normally

## Global Headlines (gdelt-headlines edge function)

- Query: `(protest OR conflict OR violence OR unrest OR cyberattack OR coup OR invasion OR strike OR blockade) sourcelang:english`, 6h timespan, 75 records max, sorted DateDesc, returns top 25
- Server-side classification (case-insensitive title scan, first match wins): CYBER → COUP → INVASION → CONFLICT → VIOLENCE → PROTEST → UNREST → OTHER
- Diagnostic: edge function logs `tagCounts` distribution
- Client-side belt-and-suspenders: `isLikelyEnglish` filter drops titles with >30% non-ASCII
- Panel scroll: list wrapped in `max-h-[500px] overflow-y-auto scroll-thin` (custom CSS in `index.css`)
- TAG pill colored: CYBER/COUP/INVASION red, CONFLICT/VIOLENCE orange, PROTEST/UNREST yellow, OTHER dim
- Country emoji flag via inline ~40-country name→ISO2 map

## Earthquake map (USGS)

- Leaflet `MapContainer`, 200px tall, CartoDB Dark Matter tiles, `scrollWheelZoom={false}`
- One `CircleMarker` per quake: radius 3/5/7 px, color severity-dim/moderate/critical, opacity 0.7, `Popup` with M/place/USGS link
- User-location `CircleMarker` (primary, radius 8) with "Your location" tooltip
- Receives `lat`/`lng` from Dashboard

## Conflict Pulse (split from old GlobalPanel)

- Conflict Index label (HIGH > 200 / ELEVATED > 100 / NORMAL) + colored pill + explanation subtitle
- 7d articles count, top region, top theme
- PROVISIONAL thresholds — revisit after observing real GDELT volume for ~1 week

## Active Disasters (split from old GlobalPanel)

- Big number: count of active Orange/Red GDACS events
- Up to 5 events listed: `<TYPE> <location> <ALERT pill>`, clickable to GDACS report URL
- Type abbreviations: EQ/TC/FL/VO/DR/WF
- Alert pill colored: Red → severity-critical, Orange → severity-moderate

## Removed / deprecated

- **GlobalPanel removed (2026-04-20)** — split into ConflictPulsePanel + ActiveDisastersPanel for masonry layout.
- **CISA removed (2026-04-20)** — CYBER tag in Global Headlines surfaces major cyber news. A real cyber-threat panel deserves its own design (see `mem://future-enhancements`).
- `supabase/functions/news-feed/index.ts` and `useNewsFeed` hook are DEPRECATED — kept temporarily, removed in follow-up.

## Graceful degradation

Proxied panels with API keys (NASA, AirNow, EIA) return `{ notConfigured: true }` when their secret is missing and render a "Not configured — contact administrator" message. GDELT and GDACS are keyless and have no notConfigured path.
