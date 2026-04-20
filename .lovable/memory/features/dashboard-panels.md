---
name: Dashboard Panels
description: Specifications for the live dashboard panels and their data sources
type: feature
---

# Dashboard Panels (11 total)

Rendered in `src/pages/Dashboard.tsx`. All third-party API keys live as Cloud Secrets and are proxied through Supabase Edge Functions (see `mem://architecture/api-security-model`).

## Panels

| Panel | Component | Data source | Access |
|---|---|---|---|
| Weather | `WeatherPanel` | Open-Meteo | Direct (no key) |
| Alerts | `AlertsPanel` | NWS api.weather.gov | Direct (no key) |
| Earthquakes | `EarthquakesPanel` | USGS earthquake feed | Direct (no key) |
| Space Weather | `SpaceWeatherPanel` | NOAA SWPC (Kp parsing hardened against NaN) | Direct (no key) |
| NASA | `NasaPanel` | DONKI flares/CMEs + NEO close approaches | `nasa-space` proxy (NASA_API_KEY) |
| Air Quality | `AirQualityPanel` | AirNow observations | `airnow-observations` proxy (AIRNOW_API_KEY) |
| Grid Status | `GridStatusPanel` | EIA PJM demand + fuel mix + 24h trend | `eia-grid` proxy (EIA_APP_KEY) |
| National | `NationalPanel` | RSS aggregation | Direct |
| Global Headlines | `GlobalHeadlinesPanel` | GDELT artlist 6h, server-classified into CYBER/COUP/INVASION/CONFLICT/VIOLENCE/PROTEST/UNREST/OTHER tags | `gdelt-headlines` keyless proxy |
| Global | `GlobalPanel` | GDACS direct + GDELT 7d conflict/protest aggregation | GDACS direct; `gdelt-events` keyless proxy |
| System Health | `SystemHealthPanel` | Internal (refresh interval, source status) | Internal |

## Layout (default — Global wide)

xl 3-col:
- Row 1: Weather · Alerts · Earthquakes
- Row 2: Space Wx · NASA · Air Quality
- Row 3: Grid Status · National · Global Headlines
- Row 4: Global (col-span-2) · System Health

Mobile single-column order: Alerts → Weather → Earthquakes → Space Wx → NASA → Air Quality → Grid Status → National → Global Headlines → Global → System Health.

## Global Headlines (gdelt-headlines edge function)

- Query: `(protest OR conflict OR violence OR unrest OR cyberattack OR coup OR invasion OR strike OR blockade)`, 6h timespan, 50 records max, sorted DateDesc
- Server-side classification (case-insensitive title scan, first match wins): CYBER → COUP → INVASION → CONFLICT → VIOLENCE → PROTEST → UNREST → OTHER
- Dedup by `${domain}::${title.slice(0,80).toLowerCase()}`
- Returns top 10 newest with `{ tag, title, url, country, domain, seendate }`
- 5-min in-memory cache + stale-on-failure (respects GDELT 1-req/5-sec limit)
- Hook `useGdeltHeadlines` floors refresh at 15 min
- TAG pill colored: CYBER/COUP/INVASION red, CONFLICT/VIOLENCE orange, PROTEST/UNREST yellow, OTHER dim
- Country emoji flag via inline ~40-country name→ISO2 map; unknown countries get no flag

## CISA removed (2026-04-20)

CISA cyber advisories were dropped from the dashboard. Rationale: cyber threat intel is operationally distinct from situational awareness; the new CYBER tag in Global Headlines surfaces major cyber incidents that make global news. A real cyber-threat panel would deserve its own design (CISA KEV + NVD + CVE trending) rather than a vestigial section.

## Deprecated

`supabase/functions/news-feed/index.ts` and `useNewsFeed` hook are marked DEPRECATED as of 2026-04-20 — kept temporarily, removed in follow-up after Global Headlines verifies in production. NewsAPI/CISA/ReliefWeb/USGS/NWS-state aggregation no longer rendered.

## GDELT thresholds (PROVISIONAL)

`GlobalPanel` Conflict Index thresholds are guessed values (>200 HIGH, >100 ELEVATED). Revisit after observing real GDELT volume for ~1 week.

## Graceful degradation

Proxied panels with API keys (NASA, AirNow, EIA) return `{ notConfigured: true }` when their secret is missing and render a "Not configured — contact administrator" message instead of an error. GDELT and GDACS are keyless and have no notConfigured path.
