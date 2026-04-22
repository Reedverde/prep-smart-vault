

# Plan — Switch Power Outages to Gannett's PowerOutage.us mirror

## Context (what we just learned)

- Kubra returned `interval_generation_data` as `"data/<uuid>"` (not a bare UUID), so my URLs were malformed. Even with that fixed, all four guessed Kubra summary paths 404. Confirmed in logs.
- `poweroutage.us` itself is a JS-rendered SPA — useless from a server-side fetch.
- **Gannett's `data.tcpalm.com` mirror is server-rendered HTML** with the exact numbers we need in plain text. Confirmed by direct fetch:
  - Lawrence County page: `https://data.tcpalm.com/national-power-outage-map-tracker/area/lawrence-county-pa/42073/` contains `Total tracked customers: 37,588` and "Power outages in last 72 hours" data inline.
  - PA state page: `https://data.tcpalm.com/national-power-outage-map-tracker/area/pennsylvania/42/` (same template, state-level totals).
- Updates every 15 minutes per the page's own banner. No API key required.

## What changes

**One file:** `supabase/functions/power-outages/index.ts`. No UI changes, no panel changes. Same response shape, so `PowerOutagesPanel.tsx` keeps working untouched.

## Approach

Replace the Kubra logic with two parallel HTML fetches against the Gannett mirror, then regex-parse the numbers out:

1. **Fetch in parallel:**
   - Lawrence: `…/area/lawrence-county-pa/42073/`
   - PA total: `…/area/pennsylvania/42/`
   - Standard browser User-Agent header.

2. **Parse each HTML with targeted regexes** (the page is server-rendered, the strings are stable):
   - `Total tracked customers:\s*([\d,]+)` → tracked customers
   - The page also exposes a "current outages" number near the chart canvas + a recent-history JSON blob. We'll grab the most recent "customers out" figure from the embedded chart data (a `<script>` block contains a JS array of `[timestamp, count]` pairs — we'll match the last entry).
   - Fallback: if the chart-data regex misses, treat outages as `0` and mark `status: 'partial'` so the panel still shows tracked totals.

3. **Map to existing payload shape:**
   - `lawrence: { customers: <latest out>, outages: null }` (Gannett doesn't expose a distinct "incident count," only customer totals — the panel already handles `outages == null` gracefully).
   - `paTotal: <latest PA out>`
   - `topCounties: []` (Gannett page doesn't list per-county breakdown on the state page; out of scope to scrape 67 county pages. Panel already conditionally renders this section.)
   - `severity` derived as today: `0` → clear, `<1000` → localized, `≥1000` → widespread.
   - `source: 'PowerOutage.us (via Gannett)'`, `sourceUrl` updated to the Lawrence page.

4. **Caching:** keep 5-minute success cache. Don't cache failures.

5. **Logging:** one structured line per request: `{ fn, lawrenceTracked, lawrenceOut, paOut, parseStatus: 'ok'|'partial'|'failed' }`. If parsing fails, also log first 300 chars of the response so we can adjust regexes from real data.

6. **Graceful fallback:** if both fetches fail or both return non-200, return current `status: 'unavailable'` payload — panel shows the same "temporarily unavailable" copy it does now, so no UX regression.

## Honest expectation

High confidence this works. I read the actual HTML during planning: the strings I'm targeting are present, server-rendered, and have been stable on Gannett's national tracker template for years. Realistic risk: the embedded chart-data JS variable name might differ slightly per page — if so, the function falls back to `partial` (tracked customers only), which is still a meaningful upgrade over today's permanent "unavailable."

## Out of scope

- Per-county PA breakdown for the "top counties" list (would require 67 fetches; not worth it).
- Historical baselines.
- Any UI changes to the panel.
- Switching to a paid PowerOutage.us API.

## Files touched

- `supabase/functions/power-outages/index.ts` — rewrite fetch + parse logic; same response shape.
- Update `sourceUrl` in `src/components/panels/PowerOutagesPanel.tsx` to point at the Gannett Lawrence page instead of the dead FirstEnergy link (one-line change).

