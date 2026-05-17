# Fix Space WX · KP tile — no data displayed

## Root cause
NOAA changed the schema of `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`. It used to be CSV-style array-of-arrays with a header row; today it returns an array of objects:

```json
[
  {"time_tag":"2026-05-10T00:00:00","Kp":0.33,"a_running":2,"station_count":8},
  ...
]
```

`useKpIndex` in `src/hooks/useDataSources.ts` still parses it as `Array<Array<any>>`, slices off a non-existent header row, then reads `r[0]` / `r[1]` — which are `undefined` on the new object shape. Result: every row is filtered out, `kpArr = []`, `latestKp = null`, and the tile renders `—`. Because the fetch itself succeeded, no STALE pill triggers either, which masked the bug.

Secondary bug: in `src/pages/Pi.tsx` the Space WX tile body passes `<PiKpField kp={null} ... />` — hardcoded null instead of the actual `latestKp`. Even after the parser fix, the field visual would stay empty.

## Changes
1. **`src/hooks/useDataSources.ts` → `useKpIndex`**
   Replace the array-index parser with object-key access, robust to both shapes:
   ```ts
   const json = await res.json();
   const rows = (Array.isArray(json) ? json : [])
     .map((r: any) => {
       // New shape: object with Kp / time_tag
       if (r && typeof r === "object" && !Array.isArray(r)) {
         const kp = Number(r.Kp ?? r.kp ?? r.kp_index);
         return { time: r.time_tag ?? r.time ?? "", kp };
       }
       // Legacy shape: [time, kp, ...] with a string header row
       if (Array.isArray(r)) {
         const kp = Number(r[1]);
         return { time: String(r[0] ?? ""), kp };
       }
       return { time: "", kp: NaN };
     })
     .filter((r) => Number.isFinite(r.kp));
   return rows;
   ```

2. **`src/pages/Pi.tsx` → Space WX tile body**
   Pass the real value:
   ```tsx
   <PiKpField kp={latestKp} size={64} color={...} />
   ```

## Out of scope
- No layout / sizing / aesthetic changes.
- No other tiles, hooks, or edge functions.
- No timeout/STALE-pill changes (already shipped last turn).
