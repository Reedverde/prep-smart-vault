## Goal
Restore the five NO DATA tiles on /pi and make the Stability Check button report *why* a source failed, not just that it did.

## Root causes (from edge function logs)

| Source | Real cause |
|---|---|
| GDELT events + headlines | Public API rate limit: "one request every 5 seconds." Both hooks fire in parallel on cold cache → second one 429s. |
| Cloudflare Radar | `/radar/attacks/layer7/summary` returns 400 "No route for that URI". `Promise.all` fails the entire response. |
| Power Outages (PA) | Edge function fetched 282KB successfully. Failure is downstream parsing/shape, not the fetch. |
| Hazard Outlook 7d | No errors logged. NWS office likely hasn't posted a current HWO; tile conflates "empty" with "error". |

## Changes

### 1. GDELT rate limit hardening
**`supabase/functions/_shared/cache.ts`** (or inline if shared file is thin): bump GDELT TTL to 10 min, and make `serveCached` return stale-cache on 429 instead of throwing. Add a `stale: true` flag on the payload so the panel can label it.

**`supabase/functions/gdelt-events/index.ts`** and **`gdelt-headlines/index.ts`**:
- On 429, return last-known-good with `{ stale: true, reason: "rate_limited" }` and HTTP 200 (so the React Query call resolves).
- Keep 10 min cache so cold-start is the only collision window.

### 2. Cloudflare Radar endpoint fix
**`supabase/functions/cloudflare-radar/index.ts`**:
- Replace broken `/radar/attacks/layer7/summary` with current endpoint (verify via web search before patching — likely `/radar/attacks/layer7/timeseries_groups` or drop attacks subcall entirely if no working replacement).
- Wrap each sub-call in its own `try/catch` and return partial results: `{ traffic, attacks: null, ...errors: ["attacks: 400"] }` instead of failing the whole response.

### 3. Power Outages parser
**`supabase/functions/power-outages/index.ts`**:
- Add a debug log of the top-level JSON keys when parsing produces zero outages, so we can see the actual shape.
- If shape mismatch detected, return `{ outages: null, parseError: "..." }` with 200, not silent empty.

**`src/hooks/useDataSources.ts`** consumer: surface `parseError` as a thrown error so React Query state goes to `error` (which Stability Check can then report).

### 4. Hazard Outlook empty vs error distinction
**`src/components/panels/HazardousOutlookPanel.tsx`** + the matching PiTile renderer:
- If fetch succeeds but `dayOne.text` and `extended` are both empty → render "no outlook posted" (neutral, no NO DATA badge).
- If fetch errors → keep current error rendering. This removes a false NO DATA.

### 5. Stability Check failure detail
**`src/components/panels/HealthCheckButton.tsx`**:
- Already captures `error.message`; expand the display:
  - Show HTTP status when present in error message
  - Show "stale (rate limited)" badge when `data.stale === true`
  - Show "partial" badge when `data` has an `errors[]` array (Cloudflare partial response)
  - Add a small expand/collapse for the full error text per row
- Extend the diagnostics JSON copy to include `data.stale`, `data.errors`, and the React Query `errorUpdateCount`.

## Verification
- After each edge function edit, call it via `supabase--curl_edge_functions` to confirm 200 + sane payload.
- Reload /pi, click Force Refresh, confirm:
  - GDELT tiles populate (may say "stale" on cold start, that's expected and labeled)
  - Internet Health renders even if attacks subcall is null
  - Outages tile either shows real outages or a specific parse error (not silent NO DATA)
  - Hazard Outlook shows neutral "no outlook posted" instead of NO DATA when NWS hasn't issued one

## Out of scope
- No frontend styling changes beyond the empty-state copy on HWO + the new badges in Stability Check.
- No changes to other working tiles.
- No hyphens in any new copy.