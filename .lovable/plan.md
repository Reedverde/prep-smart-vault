

# Plan — Persistent cache so new windows load instantly

## Why it's slow now

Every new tab/window creates a fresh in-memory React Query cache. Result: ~16 panel queries all fire from scratch, many waiting on edge-function cold starts (NASA, FRED, EIA, GDELT, Cloudflare, Power Outages, Freightos, AirNow, NWS HWO). Nothing is shared between windows or sessions.

Two compounding issues:
1. **No QueryClient defaults** — `new QueryClient()` with no options means default `staleTime: 0`, so even within a single session, navigating away and back re-fetches.
2. **No persistence** — cache lives in JS memory only; closing or opening a new tab loses everything.

## Fix — three layers

### Layer 1: Persist React Query cache to `localStorage` (biggest win)

Add `@tanstack/query-sync-storage-persister` + `@tanstack/react-query-persist-client`. Wrap the app with `PersistQueryClientProvider` instead of `QueryClientProvider`. Every successful query result is mirrored to `localStorage` under one key (`preppi-rq-cache`), and on app boot the cache is hydrated synchronously before any component mounts.

Effect: open a new window → tiles render with the last-known values **instantly** (within ms), then quietly revalidate in the background. No spinners on cold open as long as the data is younger than the max age.

Configuration:
- `maxAge: 24 * 60 * 60 * 1000` (24h) — anything older is discarded on hydrate
- `buster: <app version string>` — invalidate on deploy if data shape changes
- Throttle writes (built-in 1s) to avoid thrashing localStorage
- Exclude no-op error states from being persisted (default behavior)

### Layer 2: Sensible QueryClient defaults

Update `new QueryClient()` in `src/App.tsx`:

```ts
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,           // 5 min — don't refetch on every mount
    gcTime: 24 * 60 * 60 * 1000,        // 24h — keep in cache long enough to persist
    refetchOnWindowFocus: false,         // already polling; focus refetch is noise
    refetchOnReconnect: true,
    retry: 1,
  },
},
```

Per-query `refetchInterval` and `staleTime` already set in `useDataSources.ts` continue to override these defaults where appropriate.

### Layer 3: Server-side cache headers on edge functions (smaller win, helps Pi/offline)

Most edge functions already cache in-memory inside the function (`fred-stress`, `freightos-fbx`). Add `Cache-Control: public, max-age=300, stale-while-revalidate=900` to JSON responses on the slow ones:

- `nasa-space` (DONKI + NEO is heavy)
- `fred-stress` (already has 1h in-memory cache)
- `eia-grid`, `eia-fuel`
- `cloudflare-radar`
- `power-outages`
- `gdelt-events`, `gdelt-headlines`
- `nws-hwo`

This lets the browser HTTP cache and any CDN in front of Supabase serve repeat requests without invoking the function. Auth-required functions (`requireUser`) still need the JWT but the `Cache-Control` directive applies to the response, not the auth check.

Skip: `airnow-observations` (location-specific, low-value to cache long).

## Files touched

1. **`src/App.tsx`** — swap `QueryClientProvider` for `PersistQueryClientProvider`, add `createSyncStoragePersister`, add `defaultOptions` to `QueryClient`. ~15 lines changed.
2. **`package.json`** — add `@tanstack/react-query-persist-client` and `@tanstack/query-sync-storage-persister` (both peer-compatible with the installed `@tanstack/react-query`).
3. **8 edge functions** listed above — add one `Cache-Control` header line to the success response. No logic changes.

No changes to: `useDataSources.ts` (per-query options stay), panel components, auth, routes.

## What the user will notice

- **First load ever** (or after 24h): same as today — cold fetches, spinners.
- **Every subsequent new window/tab**: tiles render immediately with last-known values. A subtle revalidation happens in the background; values update silently if anything changed.
- **Returning after a few hours**: instant render of cached values, then quiet refresh.
- **After a deploy**: `buster` invalidates the cache once, then the new normal kicks in.

## Risks / out of scope

- Stale data risk is bounded by per-query `refetchInterval` already in place — nothing displays >24h old, and live polling continues.
- No service-worker / true offline mode in this pass (would add complexity; `localStorage` persistence covers the "instant new window" case).
- No IndexedDB upgrade (localStorage is enough for the ~50–200KB of JSON involved; can revisit if quota becomes an issue).
- No changes to user settings, auth flows, or panel layout.

## Acceptance check after implementation

1. Open `/dashboard` cold → wait for all tiles to populate → close tab.
2. Open a new window to `/dashboard` → tiles should render with values **before** any network request completes (visible in DevTools Network).
3. `localStorage` contains a `preppi-rq-cache` entry with serialized query data.
4. Background refetches still occur per each query's `refetchInterval`.
5. No console errors; no layout shift on hydrate.

