

# Refactor API Keys: Cloud Secrets + Edge Function Proxies

Move third-party API keys from per-user `user_settings` columns to app-wide **Cloud secrets**. Since Cloud secrets live server-side only, any panel that uses one must call through a thin **edge function proxy** — the browser can't read the secret directly.

## Secrets to add (Cloud → Secrets)

App-wide, managed by you:

- `AIRNOW_API_KEY` — you have this ready
- `ACLED_API_KEY` + `ACLED_EMAIL` — when available
- `EIA_API_KEY` — when available (U.S. Energy Information Administration, for future energy/grid panel)
- `NEWSAPI_KEY` — when available

I'll prompt you for `AIRNOW_API_KEY` now via `add_secret`. The others will be added as their panels get built, so the app won't error on missing keys.

## Edge functions (new, public, `verify_jwt = false`)

All are tiny read-only proxies that read the Cloud secret server-side and forward the upstream response:

| Function | Reads secret | Accepts | Returns |
|---|---|---|---|
| `airnow-observations` | `AIRNOW_API_KEY` | `lat`, `lng`, `distance` | AirNow JSON array |
| `acled-events` | `ACLED_API_KEY`, `ACLED_EMAIL` | optional date range | ACLED JSON |

Each function:
- Returns `503 { error: "not_configured" }` if its secret is missing — panels render the existing "not configured" empty state instead of crashing
- Sets CORS headers
- No auth required (read-only public data, no user PII)

EIA and NewsAPI functions will be added later alongside their panels.

## Database migration

`user_settings` table — drop now-unused columns:

- `airnow_api_key`
- `acled_api_key`
- `acled_email`

Kept per-user:
- `location_name`, `latitude`, `longitude`, `timezone`
- `alert_tier_1/2/3`
- `channel_banner`, `channel_web_push`, `channel_email`, `channel_ntfy`
- `ntfy_topic`
- `refresh_interval_min`

## Frontend changes

**`src/hooks/useDataSources.ts`**
- `useAirQuality(lat, lng, refreshMs)` — calls `supabase.functions.invoke('airnow-observations', ...)`. Drops the `apiKey` argument. Treats `503 not_configured` as "disabled" (returns `null`, no retry).
- `useAcled(refreshMs)` — calls `supabase.functions.invoke('acled-events', ...)`. Drops `email`/`apiKey` arguments. Same `not_configured` handling.

**`src/hooks/useUserSettings.tsx`**
- Remove `airnow_api_key`, `acled_api_key`, `acled_email` from the `UserSettings` type.

**`src/pages/Settings.tsx`**
- Delete the entire **API Keys** section (`ApiKeysSection`). Settings grid becomes: Location · Alerts & Notifications · Account. Layout simplifies to a two-column responsive grid.

**`src/components/panels/AirQualityPanel.tsx`**
- Drop the `apiKey` prop. Empty state changes from "Add your AirNow key in Settings" to "Air quality data not configured yet — contact the administrator" when the proxy reports `not_configured`. Otherwise render normally.

**`src/components/panels/GlobalPanel.tsx`**
- Drop `acledEmail` / `acledKey` props. Same "not configured" empty-state treatment for the conflict section. GDACS portion is unchanged (already no-auth).

**`src/pages/Dashboard.tsx`**
- Stop passing `settings.airnow_api_key`, `settings.acled_email`, `settings.acled_api_key` to panels.

## Migration order

1. Prompt you to add `AIRNOW_API_KEY` as a Cloud secret
2. Deploy `airnow-observations` and `acled-events` edge functions
3. Update frontend hooks and panels to call the proxies
4. Remove the API Keys section from Settings
5. Run DB migration dropping the three unused columns

Steps 2–4 are safe to land before step 5 — the columns just sit unused for a minute.

## Security notes

- Secrets never leave the server — no way for a client to exfiltrate them from devtools
- Edge function proxies are read-only, rate-limit-friendly, and forward only the fields needed
- RLS on `user_settings` is unaffected (columns dropped, not policies)

## Out of scope

- No EIA or NewsAPI panels yet — just reserving the secret names in the plan
- No change to the existing alert pipeline (Stage 4 work)
- No change to NWS / USGS / SWPC / GDACS panels (those stay browser-direct, no auth)

