## Why you're seeing "no data" blocks on the Pi

Three likely causes, in order of probability:

### 1. Kiosk browser isn't signed in (most likely)
Every "proxy" panel — AirNow, NASA, EIA Grid, EIA Fuel, GDELT, GDELT Headlines, Cloudflare Radar, FRED, Power Outages, NWS HWO — goes through Supabase Edge Functions that **require a logged-in user JWT**. In `useDataSources.ts → edgeHeaders()`, if there's no session it falls back to the anon key, and our edge functions reject that with 401. That single root cause explains roughly **2/3 of the panels going blank**.

The desktop browser stays signed in because you logged in once; the Pi kiosk likely boots into a fresh profile with no session.

### 2. 20 s fetch timeout is too aggressive for Pi 3 WiFi
`FETCH_TIMEOUT_MS = 20_000` in `useDataSources.ts`. NWS weather alone chains **points → forecast → hourly → stations → up to 4 station observations** sequentially. On Pi 3 b/g WiFi + cold Supabase edge cold-starts (we saw boot times + GDELT 429s in the logs), 20 s often isn't enough → fetch aborts → panel shows no data.

### 3. Panels render "no data" silently on error
Most panels treat `error` the same as "empty" — no visible badge telling you it's a network failure vs. truly nothing to show. That's why everything looks the same when really there are 3 different problems.

## The plan

### A. Make sure the kiosk is authenticated
Two options, pick one:

1. **Operational fix (zero code):** On the Pi, open `/login` once, sign in, check "remember me". Chromium kiosk persists localStorage across reboots if you don't pass `--incognito` and the user-data-dir is writable. This alone probably fixes ~70% of the blank panels.
2. **Code fix (recommended for kiosk):** Add a dedicated `KIOSK_EMAIL` / `KIOSK_PASSWORD` pair stored as Pi-side env or a config file, and auto-sign-in on `/pi` mount if no session. (Slightly out of scope of this loop — flag for follow-up unless you want it now.)

### B. Pi-friendly fetch behavior (code changes)
Edit `src/hooks/useDataSources.ts`:

- Bump `FETCH_TIMEOUT_MS` from 20 s → **45 s** (Pi WiFi + edge cold starts).
- Add a single retry with backoff inside `fetchWithTimeout` for network-level failures (abort/`TypeError: Failed to fetch`), not for HTTP error statuses.
- In `useWeather`, parallelize the station-observation loop (currently sequential `for` loop hitting up to 4 stations) → `Promise.any` with timeouts. Cuts worst-case weather load from ~80 s to ~20 s.
- Add a User-Agent contact string in `nwsHeaders` (NWS officially requires `App (contact-email)`; missing email is a known cause of intermittent 403s). Use a generic mailto so we don't leak personal info.

### C. Visible "no data" diagnosis (small UI change)
Add a tiny helper in `PanelKit.tsx` — `<NoDataReason error={error} hasData={!!data} />` — that renders one of:
- `OFFLINE` (when `!navigator.onLine`)
- `AUTH REQUIRED` (when error message includes 401 or 403)
- `TIMEOUT` (when error is `AbortError`)
- `UPSTREAM ERROR` (other fetch errors)
- `NO DATA` (genuinely empty response)

Wire it into the ~6 panels that today silently render an empty state. Now when you look at the Pi you'll know *why* each block is empty instead of guessing.

### D. SystemHealthPanel improvement
On the Pi this panel is your dashboard's dashboard. Add a row at top: **"Signed in: yes / NO — sign in to enable proxied sources"** in red when there's no session. That makes cause #1 self-diagnosing forever.

## Files to touch

- `src/hooks/useDataSources.ts` — timeout bump, retry, parallel stations, NWS UA
- `src/components/PanelKit.tsx` — add `NoDataReason` helper
- 6 panel files (AirQuality, NASA, EIA Grid, GDELT Headlines, Cloudflare, FRED) — swap silent empty states for `<NoDataReason />`
- `src/components/panels/SystemHealthPanel.tsx` — add auth-status row

## What this does NOT do
- Doesn't auto-login the kiosk (option A.2 above) — flag it if you want that as a follow-up
- Doesn't cache responses for offline use — that's the Stage-5 Pi mirror work already in memory
- Doesn't touch any edge functions or backend

## Suggested next step
Once you send the pictures I can confirm which panels are failing and whether my probability ordering above matches reality. But this plan addresses all three root causes regardless — so you can also just say "go" and I'll implement.
