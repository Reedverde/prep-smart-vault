# Why the Pi screen shows different data than the desktop

## 1. What each tile renders when its feed fails

There is **no error-aware rendering** in `src/pages/Pi.tsx`. Every tile reads `query.data?...` and falls through to a zero or em-dash. The React Query error state (`isError`, `failureCount`) is never consulted. A failed fetch and a real-zero look identical.

**Headlines (tile 13, `src/pages/Pi.tsx` ~307–316, 620–628)**
```ts
const headlinesData: any = headlines.data;
const headlineCount: number = headlinesData?.items?.length ?? 0;   // ← fail = 0
const headlinesBars: number[] = (() => {
  if (!headlinesData?.items) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  ...
})();
...
<Big size={92} ...>{headlineCount}</Big>     // renders "0"
```
That's exactly the "0" you saw on the Pi.

**Power Outages (tile 10, ~257–269, 560–583)**
```ts
const outageUnavail = outageData?.status === "unavailable"; // only true if the server returns a payload
const outageCust: number = outageData?.lawrence?.customersOut ?? 0; // ← fail = 0
...
{outageUnavail ? "—" : outageCust.toLocaleString()}          // renders "0"
```
`outageUnavail` only triggers when the edge function *succeeds* and reports unavailable. A timeout / 500 / network error skips this branch entirely and you get a green "0".

**Conflict Pulse (tile 11, ~272–292, 584–606)**
```ts
const conflictCount = conflictData?.count ?? null;
const conflictLabelTxt = conflictCount == null ? "—" : conflictCount > 200 ? "HIGH" : ...;
const conflictSeries: number[] = (() => {
  const vals: number[] = conflictData?.byRegion ? ... : [];
  if (vals.length === 0) return [0, 0];                        // ← fail = flat line
  ...
})();
...
<Big size={64} ...>{conflictLabelTxt}</Big>                     // renders "—"
{conflictCount?.toLocaleString() ?? "—"} ARTICLES               // renders "— ARTICLES"
<PiAreaChart data={conflictSeries} ... />                       // flat line
```
That matches the empty Pi tile in the photo.

## 2. The fetch timeout

There is none. `src/hooks/useDataSources.ts` calls `fetch(url, { headers })` everywhere — no `AbortController`, no `signal`, no per-call timeout. React Query options used:

- `refetchInterval: refreshMs` — how often to retry
- `staleTime: refreshMs * 0.8`
- `retry: 1` on the edge-proxied feeds

So on a slow Pi 3 WiFi:
- A hung fetch waits on the browser's default socket timeout (often >60s).
- React Query keeps `data === undefined`, `isError === false` while in-flight.
- The tile renders the zero-fallback the whole time.
- One retry, then the tile sticks at zero until the next `refetchInterval`.

Why the desktop differs: the desktop completes the first fetch in <1s and you see real numbers; the Pi's first fetch either fails or is still pending when you look.

## 3. Plan — add per-tile STALE / NO DATA indicator + real timeouts

### A. Add a fetch timeout helper (`src/hooks/useDataSources.ts`)
Wrap every `fetch(...)` in an `AbortController` with a generous Pi-friendly timeout.

```ts
const FETCH_TIMEOUT_MS = 20_000; // 20s — long enough for Pi 3 WiFi, short enough to surface failure

const fetchWithTimeout = async (url: string, init: RequestInit = {}, ms = FETCH_TIMEOUT_MS) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
};
```
Replace every `fetch(` in `useDataSources.ts` with `fetchWithTimeout(`. No other call-site changes.

### B. Expose a `staleness` flag on PiTile (`src/components/PiTile.tsx`)
Add an optional prop `status?: "ok" | "stale" | "nodata" | "loading"` (default `"ok"`). When `"stale"` or `"nodata"`, render a small pill in the header row (right of the label, before the slot id):

```text
[ STALE ]   or   [ NO DATA ]
```
Styled with existing `.pi-pill` + `pi-c-yellow` (stale) / `pi-c-red` (nodata). Pure presentation, no logic changes to the body.

### C. Wire each tile to its query state (`src/pages/Pi.tsx`)
For every `useXxx` hook, compute a derived status:

```ts
const tileStatus = (q: { data: unknown; isError: boolean; isLoading: boolean; dataUpdatedAt: number }) => {
  if (q.isError && !q.data) return "nodata";
  if (q.isError && q.data) return "stale";
  if (!q.data && q.isLoading) return "loading";
  // stale if last successful fetch is >2× the refresh interval old
  return "ok";
};
```

Pass `status={tileStatus(headlines)}` to the Headlines tile, `status={tileStatus(outages)}` to Power Outages, `status={tileStatus(conflict)}` to Conflict Pulse, and the same for the other 14 tiles. No body / layout / data-source / grid changes — just an extra header pill when something is wrong.

### D. Stop the misleading-zero pattern in the three confirmed tiles
- **Headlines body**: when `status !== "ok"` and `headlineCount === 0`, render `—` instead of `0`.
- **Power Outages body**: treat `outages.isError` the same as `outageUnavail` (so it shows `—` + "feed unavailable").
- **Conflict Pulse body**: already shows `—`; keep, but the new STALE pill makes the cause obvious.

### Files touched
- `src/hooks/useDataSources.ts` — add `fetchWithTimeout`, swap all `fetch` calls.
- `src/components/PiTile.tsx` — add `status` prop + pill.
- `src/pages/Pi.tsx` — compute `tileStatus(...)` per hook, pass to each `<PiTile>`, harden the three zero-fallbacks above.

### Out of scope
- No grid / tile-count / layout changes.
- No data-source swaps.
- No edge-function changes.
- Other routes (`/dashboard`, `/live`) untouched — timeout helper lives in the same hook file but is opt-in via the helper call; existing call sites elsewhere keep working unchanged because we only replace `fetch` inside the hook file.
