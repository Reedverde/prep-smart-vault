## Problem
Global Headlines panel shows "No recent headlines" with no fallback to previous data. Two root causes in `supabase/functions/gdelt-headlines/index.ts`:

1. Cache is an **in-memory** `let cached` variable. Edge isolates restart frequently (visible in recent logs), wiping the cache every cold start. Other panels use the persistent `api_cache` table via `_shared/cache.ts::serveCached` — this one never migrated.
2. When upstream fails or returns junk, the function returns `{ items: [] }` with HTTP 200 and **stores that empty result in cache**. React Query (with persistence) then locks in the empty array for the full 5-minute staleTime, overwriting any prior good payload on the client.

## Plan

Rewrite `supabase/functions/gdelt-headlines/index.ts` to:

1. **Use `serveCached`** with key `gdelt-headlines:v1`, `freshMs = 5 min`, `staleMaxAgeMs = 24 h`. Cache persists across cold starts in the `api_cache` table.
2. **Inside the fetcher, throw on bad upstream** (non-OK status, non-JSON body, or zero parsed articles). Throwing lets `serveCached` fall back to the last known good payload up to 24 h old instead of poisoning cache with `[]`.
3. **Only write a successful payload** with `items.length > 0`. Empty result paths return `{ items: [], degraded: true }` with `Cache-Control: no-store` and DO NOT write to `api_cache`.
4. **Add `X-Cache` headers** from `cacheHeaders(result)` so we can tell fresh vs stale at a glance in the network tab.
5. Keep current classification, dedupe, denylist, and exclusion logic exactly as-is.

Optional follow-up (not in this change): on the client, treat `degraded: true` responses as "don't replace existing cache" — but with #2 above the server-side fix alone should keep the panel populated.

## Files touched
- `supabase/functions/gdelt-headlines/index.ts` — rewrite cache layer per above.

No frontend, no schema, no other panels affected.
