## Scope
Edge functions only. Four files. No frontend changes.

## Changes

### 1. `supabase/functions/gdelt-events/index.ts`
Replace the `Promise.all([statsRes, articlesRes])` block with sequential fetches:
- `await fetch(statsUrl, ...)` first (wrapped in try/catch that returns `null` on throw, matching current behavior).
- `await new Promise(r => setTimeout(r, 6000))`.
- `await fetch(articlesUrl, ...)`.
- Rest of the handler (stats parse, degraded fallback, articles parse, cache write) stays identical.

### 2. `supabase/functions/gdelt-headlines/index.ts`
At the top of `fetchGdelt`, before the `fetch(url, ...)` call, add:
```ts
await new Promise((r) => setTimeout(r, 6000));
```
Nothing else changes. `serveCached` will still short-circuit when a fresh cache exists, so the delay only pays on real upstream fetches.

### 3. `supabase/functions/nws-hwo/index.ts`
Rewrite the outer `catch (err)` block to return HTTP 200 with a degraded payload instead of `{ error: 'internal_error' }` at 500:
```ts
const message = err instanceof Error ? err.message : String(err);
console.error('nws-hwo error:', err);
return new Response(JSON.stringify({
  office: null,
  issuedAt: null,
  dayOne: { risk: 'clear', text: '' },
  extended: '',
  spotter: '',
  spotterActivated: false,
  productUrl: '',
  fetchedAt: new Date().toISOString(),
  degraded: true,
  error: message.slice(0, 200),
}), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'degraded' } });
```
Existing 400 `bad_coords` response is untouched.

### 4. `supabase/functions/power-outages/index.ts`
Insert a single diagnostic line immediately before the `parsePage(html)` call:
```ts
console.log('power-outages: html preview', html.slice(0, 500));
```
No other logic changes.

## Verification
After edits, call each function via `supabase--curl_edge_functions` and confirm:
- `gdelt-events` returns 200 with non-empty `byRegion` (takes ~6s on cold miss).
- `gdelt-headlines` returns 200 with `items` populated (also ~6s on cold miss, instant on cache hit).
- `nws-hwo` with bad upstream conditions returns 200 with `degraded: true`.
- `power-outages` logs the HTML preview line (checked via `edge_function_logs`).

## Out of scope
No frontend, hook, CSS, or panel changes. No response field renames. No new dependencies. Field shape on `nws-hwo` degraded payload matches existing success payload so `HazardousOutlookPanel` renders it as a stale/empty state naturally.
