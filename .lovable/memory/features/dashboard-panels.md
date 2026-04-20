---
name: Dashboard Panels
description: Specifications for the 11 live dashboard panels and their data sources
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
| News | `NewsPanel` | NewsAPI + NWS/USGS/CISA/ReliefWeb RSS, state-filtered | `news-feed` proxy (NEWS_API) |
| Global | `GlobalPanel` | GDACS direct + GDELT 7d conflict/protest aggregation | GDACS direct; `gdelt-events` keyless proxy |
| System Health | `SystemHealthPanel` | Internal (refresh interval, source status) | Internal |

## Layout (default — Global wide)

xl 3-col:
- Row 1: Weather · Alerts · Earthquakes
- Row 2: Space Wx · NASA · Air Quality
- Row 3: Grid Status · National · News
- Row 4: Global (col-span-2) · System Health

Mobile single-column order: Alerts → Weather → Earthquakes → Space Wx → NASA → Air Quality → Grid Status → National → News → Global → System Health.

State code for News filter: parsed from `user_settings.location_name` via `resolveStateCode()` — trailing `, XX` regex first, then full-name map fallback, then `null` (national-only feed).

## GDELT thresholds (PROVISIONAL)

`GlobalPanel` Conflict Index thresholds are guessed values (>200 HIGH, >100 ELEVATED). Revisit after observing real GDELT volume for ~1 week.

## Graceful degradation

Proxied panels with API keys (NASA, AirNow, EIA, News) return `{ notConfigured: true }` when their secret is missing and render a "Not configured — contact administrator" message instead of an error. GDELT and GDACS are keyless and have no notConfigured path.
