# PrepPi — PROJECT DOCS

Comprehensive reference for the PrepPi codebase. Give this to a stranger and they understand the whole project.

Last updated: 2026-06-08

## 1. Project Overview

PrepPi is a household situational awareness dashboard calibrated for Western Pennsylvania (default: New Castle, PA 41.0034, -80.347). It pulls 15+ public data sources into one calm always on screen. Built by Reed Verdesoto at eVerde (everde.co).

| Field | Value |
|-------|-------|
| Live URL | https://preppi.everde.co |
| Published URL | https://prep-smart-vault.lovable.app |
| GitHub | github.com/Reedverde/prep-smart-vault |
| Lovable Project ID | 82cfc51b-bc44-4e25-bf05-e20b6c37b242 |
| Supabase Ref | xueqkmnxhbhtnrltsqmi |
| Stack | Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui + React Query v5 + Recharts + Leaflet |

## 2. Architecture

SPA (React Router) calling Supabase Edge Functions (Deno) which proxy credentialed third party APIs. Supabase Postgres stores user data. React Query persists a 24h cache to localStorage (key: preppi-rq-cache, busted by version constant preppi-v1).

Request flow: Browser > React Query hook (src/hooks/useDataSources.ts) > either direct keyless API (NWS, USGS, SWPC, GDACS) or Edge Function proxy (AirNow, EIA, NASA, GDELT, Cloudflare Radar, FRED, power outages, NWS HWO).

Cache defaults: staleTime 5 min, gcTime 24h, refetchOnWindowFocus off, refetchOnReconnect on, retry 1. Per hook overrides exist (e.g. 15 min floor on GDELT headlines).

## 3. Data Model (5 tables, all RLS enabled)

### user_settings
user_id (uuid PK), latitude (default 41.0034), longitude (default -80.347), location_name, timezone (default America/New_York), refresh_interval_min (default 10), channel_email, channel_web_push, channel_banner, channel_ntfy, ntfy_topic, alert_tier_1, alert_tier_2, alert_tier_3, created_at, updated_at. Trigger handle_new_user auto inserts on signup.

### alerts
id, user_id, external_id, source, tier (smallint), event_type, severity, headline, description, area_desc, issued_at, expires_at, dismissed_at, delivered_channels (text[]), created_at.

### library_docs
id, user_id, title, description, tags[], categories[], doc_type, storage_path, drive_file_id, original_filename, mime_type, page_count, text_content, created_at, updated_at.

### inventory_items
id, user_id, name, category, quantity, unit, expires_at, location, notes, created_at, updated_at.

### snapshots
id, user_id, kind (default 'manual'), title, notes, dashboard_data jsonb, summary jsonb, screenshot_url, captured_at, created_at.

### RLS Policy
Every table: only the row owner (auth.uid() matches user_id) may select, insert, update, or delete. No public exposure.

### DB Functions
set_updated_at() — generic timestamp trigger. handle_new_user() — SECURITY DEFINER, seeds user_settings on signup.

## 4. Auth

Email/password via Supabase Auth. No Google OAuth. Sessions in localStorage via Supabase client. Anon key path enabled in _shared/auth.ts for /pi kiosk (intentional). No user_roles table (single tenant per account).

## 5. Component Inventory

### Routes

| Path | Component | Auth | Purpose |
|------|-----------|------|---------|
| / | Index | No | Landing/redirect |
| /login | Login | No | Email/password sign in |
| /reset-password | ResetPassword | No | Password reset |
| /dashboard | Dashboard | Yes | 19 panel desktop view |
| /live | Live | Yes | Wide wall view |
| /pi | PiKiosk | Anon key | Kiosk glance (1024x600) |
| /pi3 | Pi3 | Anon key | Lightweight kiosk (static render) |
| /snapshots | Snapshots | Yes | Capture history |
| /library | Library | Yes | Document archive |
| /operations | Operations | Yes | Inventory + ops |
| /settings | Settings | Yes | Location, channels, tiers |

### Key Components
PiTile — reusable tile wrapper for kiosk views
PiViz — visualization components for kiosk tiles
Pi3Tile — pi3 tile wrapper (reuses PiTile + override CSS)

### Design Tokens
src/index.css — HSL custom properties (background, foreground, primary, severity tiers)
tailwind.config.ts — maps tokens to utility classes
src/styles/pi.css — kiosk tokens (.pi-big-clock 72px, kiosk spacing)
src/styles/pi3.css — .pi3-static override (animation: none !important)

## 6. Edge Functions (11)

All GET only. Auth gate: _shared/auth.ts::requireUser. CORS: shared headers.
Error contract: 503 + {notConfigured:true, key:'NAME'} when secret missing; 502 with last upstream status on retry exhaustion.

| Function | Upstream | Key Required |
|----------|----------|--------------|
| airnow-observations | EPA AirNow | AIRNOW_API_KEY |
| cloudflare-radar | Cloudflare Radar | CLOUDFLARE_RADAR_API_TOKEN |
| eia-fuel | EIA | EIA_APP_KEY |
| eia-grid | EIA | EIA_APP_KEY |
| fred-stress | FRED (St. Louis Fed) | FRED_API_KEY |
| freightos-fbx | Freightos FBX | (none documented) |
| gdelt-events | GDELT 2.0 | None (keyless) |
| gdelt-headlines | GDELT 2.0 | None (keyless) |
| nasa-space | NASA DONKI/NEO | NASA_API_KEY |
| nws-hwo | NWS | None (keyless) |
| power-outages | FirstEnergy/Penelec | None (scrape) |


## 7. Data Sources

### Browser Direct (keyless)
NWS (api.weather.gov) — alerts, forecast, HWO
USGS — earthquakes
NOAA SWPC — space weather (Kp index)
GDACS — global disasters
Iowa Mesonet — NEXRAD radar tiles
CartoDB Dark Matter — basemap tiles
NASA SDO — sun imagery

### Edge Function Proxied
AirNow, EIA (grid + fuel), NASA DONKI/NEO, FRED, Cloudflare Radar, GDELT (events + headlines), FirstEnergy/Penelec power outages, NWS HWO

### Not Yet Wired


### Link Only
Broadcastify — Lawrence County scanner feed 33610

## 8. Environment Variables

### Supabase Secrets (server only)
NASA_API_KEY, AIRNOW_API_KEY, EIA_APP_KEY, FRED_API_KEY, CLOUDFLARE_RADAR_API_TOKEN, LOVABLE_API_KEY (managed)

### Frontend .env (publishable only)
VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL

## 9. Stability & Monitoring

| Area | Status |
|------|--------|
| Error boundary | NOT BUILT — one tile throw kills the dashboard |
| Error logging table | Not built |
| Sentry / external monitor | Not configured |
| UptimeRobot | Not configured |
| Edge function logs | console.log/error only |
| Structured logging | Not enforced |

## 10. Key Decisions

1. Pi 3 at hardware ceiling. No software perf work. Target Pi 5 8GB.
2. Kiosk anon key is intentional.
3. news-feed deprecated, replaced by gdelt-headlines.
4. ACLED provisioned but not wired.
5. Display EDID fix via cmdline.txt kernel parameter.
6. All API keys server side only (Supabase Secrets).
7. React Query 24h localStorage cache for offline resilience.
8. Additive file strategy for new routes.
9. No hyphens in any content, ever.

## 11. Deployment

| Area | Detail |
|------|--------|
| Frontend | Lovable auto deploy on save |
| Edge functions | Supabase auto deploy on save |
| Custom domain | preppi.everde.co (CNAME to Lovable) |
| Preview | id-preview--82cfc51b-bc44-4e25-bf05-e20b6c37b242.lovable.app |
| CI/CD | None external |

## 12. File Structure

```
src/
  components/          Page level components
  components/panels/   19 dashboard panels
  hooks/
    useDataSources.ts  React Query hooks for all upstream data
  lib/
    dataSources.ts     Shared fetch logic (extracted for /pi3)
  pages/               Route page components
  styles/
    pi.css             Kiosk tokens
    pi3.css            Pi3 override stylesheet
  index.css            Design tokens (HSL custom properties)
supabase/
  functions/           12 edge functions
  functions/_shared/   auth.ts (requireUser gate)
  migrations/          Schema migrations
```
