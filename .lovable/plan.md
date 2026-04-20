

# Three Data-Accuracy Fixes (Final)

Approved with shortened Conflict Index subtitles. Proceeding with the rest as specified.

## 1. GDACS: Filter to currently-active Orange/Red events

In `src/hooks/useDataSources.ts` → `useGdacs`:
- Change query from `alertlevel=Green;Orange;Red` to `alertlevel=Orange;Red`
- After fetch, filter features to `properties.iscurrent === "true"`
- Add comment: *"Major disasters = currently-active GDACS events at Orange (humanitarian impact likely) or Red (severe humanitarian impact) alert level. Green excluded — minor events. iscurrent filter excludes events that have already ended."*

Expected: count drops from ~100 to ~10–30. The `> 5` warning threshold in `GlobalPanel.tsx` stays.

## 2. News Feed: per-source diagnostics + diversity cap

**Edge function** `supabase/functions/news-feed/index.ts`:
- Build `sourceCounts: { newsapi, nws, usgs, cisa, reliefweb }` counted **before** dedup
- Build `sourceErrors: Record<string, string>` — capture from `safeFetchRss` (return `{items, error}` instead of bare array) and the NewsAPI fetch (HTTP status or exception message)
- **Cap each source at 3 items** before merging (prevents USGS dominance)
- Raise final output from 10 → 15
- `console.log` the counts/errors for inspection
- Response shape: `{ items, sourceCounts, sourceErrors }`

**Frontend** `src/components/panels/NewsPanel.tsx`:
- Read `sourceCounts` from response
- Compute dynamic source attribution: only include labels where `sourceCounts[x] > 0`. Pass as the `source` prop (e.g. `NewsAPI · NWS · USGS` if CISA/ReliefWeb are dead)
- `console.warn` on first render where any source has count 0, naming the dead source(s) and their error if present
- No UI removal of sources yet — diagnostics first, decisions after

## 3. Conflict Index: short explanatory subtitle

In `src/components/panels/GlobalPanel.tsx`:
- Add helper `conflictExplanation(label)`:
  - `HIGH` → `"Above typical global conflict news volume"`
  - `ELEVATED` → `"Slightly above typical global conflict news volume"`
  - `NORMAL` → `"Typical global conflict news volume"`
  - else → `null`
- Render as a one-line subtitle directly under the Conflict Index Row, only when `hasGdelt` and label is one of the three
- Styling: `font-mono text-[10px] text-dim leading-snug` — render via fragment wrapping the Row + a `<div>` underneath

## Files touched

- `src/hooks/useDataSources.ts`
- `supabase/functions/news-feed/index.ts`
- `src/components/panels/NewsPanel.tsx`
- `src/components/panels/GlobalPanel.tsx`

## Out of scope

- Replacing/removing dead news sources (decide after seeing counts)
- Re-tuning GDELT 200/100 thresholds (still PROVISIONAL)
- Visual polish, Stage 3/4/5

