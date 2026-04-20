

# Full API Integration Pass — All Panels via Cloud Secrets

Wire up every remaining panel to Cloud secrets through edge function proxies. Add three new panels (NASA, Grid Status, News), fix two bugs, and close out the Settings cleanup.

## New edge functions

Each one reads its secret server-side and returns `503 { error: "not_configured" }` if missing, `502` on upstream failure, `200` on success. All set CORS headers and run with `verify_jwt = false`.

| Function | Secret(s) | What it returns |
|---|---|---|
| `airnow-observations` (exists, keep) | `AIRNOW_API_KEY` | Current AQI observations near lat/lng |
| `nasa-space` (new) | `NASA_API_KEY` | `{ donki: [...flares, CMEs], neo: [...close approaches] }` for the last 7 days |
| `eia-grid` (new) | `EIA_APP_KEY` | PJM region: current demand, generation mix by fuel type, 24h demand trend |
| `news-feed` (new) | `NEWS_API` | NewsAPI top-5 US headlines merged+deduped with RSS (NWS state alerts, USGS M4.5+, CISA advisories, ReliefWeb) — top 10 by time |
| `acled-events` (rewrite) | `ACLED_EMAIL`, `ACLED_PASSWORD` | Conflict events last 7d aggregated by region + event type. Performs OAuth password grant to `acleddata.com/oauth/token`, caches token ~25 min in module memory, retries on 401. |

All functions declared in `supabase/config.toml` with `verify_jwt = false`. No auth required — they're read-only public data proxies.

## New panels (frontend)

**`src/components/panels/NasaPanel.tsx`** — placed next to Space Weather
- Top row: count of solar flares + CMEs in last 7 days, with severity class color
- Middle: list of NEO close approaches this week; asteroids with miss distance < 1 LD (~384,400 km) get a red "CLOSE" badge
- Bottom: `ContextBox` explaining DONKI + NEO

**`src/components/panels/GridStatusPanel.tsx`** — new
- Big number: current PJM demand (MW)
- Mini sparkline: last 24h demand trend (Recharts)
- Fuel mix bars: coal / gas / nuclear / renewables with percentages
- Badge flags >95% of 7-day peak as "HIGH LOAD"

**`src/components/panels/NewsPanel.tsx`** — new
- List of top 10 items, each row: source badge · time ago · headline (link)
- Color-code source type: NWS (red), USGS (orange), CISA (blue), ReliefWeb (purple), NewsAPI (dim)
- Wider column — spans 2 cols on md+

All three panels use the same loading / `not configured` / error patterns as existing panels.

## Updates to existing panels

**`AirQualityPanel.tsx`** — already wired through `airnow-observations` proxy. No code change needed; confirming it reads AQI + PM2.5 + Ozone correctly for the user's lat/lng. Verify during QA.

**`GlobalPanel.tsx` (Conflict Index)** — now that ACLED is actually working, replace "Not configured" fallback values with real numbers. `useAcled` hook return shape changes from `{ count }` to `{ count, byRegion, byType }`; the panel gains two small breakdown rows under the index.

**`SpaceWeatherPanel.tsx` (Kp NaN bug fix)** — in `src/hooks/useDataSources.ts`, `useKpIndex` assumes `r[1]` is Kp. The SWPC `noaa-planetary-k-index.json` feed returns `[time_tag, Kp, a_running, station_count]`, but rows can contain `null` or non-numeric strings. Fix:
- Filter out rows where `r[1]` is null/undefined
- Use `Number(r[1])` and drop `NaN` results
- In the panel, guard against empty arrays so `Kp 0.0` only shows when truly zero, not when parsing fails

## Settings cleanup

**`src/pages/Settings.tsx`** — the API Keys section is already fully removed (good). The current layout is Location · Alerts & Notifications · Account — that matches the request. No changes needed here.

## Hook updates (`src/hooks/useDataSources.ts`)

- `useKpIndex` — robust number parsing + null filter (bug fix)
- `useAcled` — update return type to `{ count, byRegion, byType, notConfigured? }`
- Add `useNasa(refreshMs)` — calls `nasa-space` proxy
- Add `useEiaGrid(refreshMs)` — calls `eia-grid` proxy
- Add `useNewsFeed(state, refreshMs)` — calls `news-feed` proxy, passes user's state for NWS filter

## Dashboard layout (`src/pages/Dashboard.tsx`)

Add the three new panels to the grid with responsive ordering:

```text
Mobile order:      Desktop 3-col order:
1. Alerts          1. Weather      2. Alerts        3. Earthquakes
2. Weather         4. Space Wx     5. NASA          6. Air Quality
3. Earthquakes     7. Grid Status  8. National      9. News (col-span-2)
4. Space Weather   10. Global (col-span-2)  11. System Health
5. NASA
6. Air Quality
7. Grid Status
8. National
9. News
10. Global
11. System Health
```

## Graceful degradation

Every new panel and every hook treats `503 not_configured` as a first-class state:
- Panel renders a small centered message: "Not configured — contact administrator"
- No retries on `not_configured` (React Query `retry: false` for that case)
- Refresh button hidden while not configured
- No crashes, no console errors

## Files touched

**New:**
- `supabase/functions/nasa-space/index.ts`
- `supabase/functions/eia-grid/index.ts`
- `supabase/functions/news-feed/index.ts`
- `src/components/panels/NasaPanel.tsx`
- `src/components/panels/GridStatusPanel.tsx`
- `src/components/panels/NewsPanel.tsx`

**Edited:**
- `supabase/functions/acled-events/index.ts` (rewrite for OAuth password grant + 7d aggregation)
- `supabase/config.toml` (register 3 new functions with `verify_jwt = false`)
- `src/hooks/useDataSources.ts` (Kp fix, ACLED shape, 3 new hooks)
- `src/components/panels/SpaceWeatherPanel.tsx` (guard parsing)
- `src/components/panels/GlobalPanel.tsx` (show real ACLED breakdown)
- `src/pages/Dashboard.tsx` (add 3 panels, reorder grid)

## Out of scope

- Alert pipeline / delivery channels (Stage 4)
- Stage 3 snapshots
- Favicon/PWA icon update

