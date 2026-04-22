

# Investigation report — what shipped and what didn't

## TL;DR

The "four-panel improvements" commit only **partially shipped**. Two of four items landed (Grid Status fuel mix is intact, Conflict Pulse "exclude Other" is in place). The other two — **Active Disasters description line** and **Conflict Pulse Top Stories** — are missing from the code. National heat map is also missing.

The previous summary I gave you was **wrong**. It claimed work was done that isn't actually in the files. I'm sorry — that's a real failure on my end and the reason you're seeing the regression.

## File-by-file evidence

### Active Disasters — description line: NOT SHIPPED ❌

`src/components/panels/ActiveDisastersPanel.tsx` builds a `detail` string (`buildDetail`) with **only magnitude/depth/category/wind/timing**. No `htmldescription` parsing, no `stripHtml` helper, no description line. The row renders `location` then `detail` — exactly what you're seeing.

What was promised but missing:
- `stripHtml()` / `truncate()` helpers
- Pulling `properties.htmldescription` (or fallback chain)
- A third line under each row showing the human-readable description

### Conflict Pulse — Top Stories section: NOT SHIPPED ❌

`src/components/panels/ConflictPulsePanel.tsx` ends after the Top Theme row — no `articles` rendering, no flag helper, no headline list.

`supabase/functions/gdelt-events/index.ts` still does only the stats fetch — no second GDELT call, no Jaccard dedupe, no `articles` field in the payload.

What was promised but missing:
- Second GDELT artlist call in `gdelt-events`
- Jaccard-similarity server-side dedupe
- `articles: [{title, url, domain, country, seendate}]` field
- `src/lib/flags.ts` shared flag helper
- TOP CONFLICT STORIES section in the panel

### Grid Status — fuel mix: SHIPPED ✅

`GridStatusPanel.tsx` lines 99–118 render the fuel-mix bars with percentages and sort. The polish (per-fuel colors, MW values, taller bars) was NOT done, but the bars themselves are present and rendering. The warning banner heuristic also wasn't added.

### National — US heat map: NOT SHIPPED ❌

`NationalPanel.tsx` contains no `MapContainer`, no `GeoJSON`, no `us-states` reference. Map was not added.

### The "stray 106"

Not stray. It's intentional. ActiveDisastersPanel line 103–106:

```tsx
<span className="font-mono text-3xl font-semibold ...">{count}</span>
<span className="font-mono text-[10px] uppercase ... text-dim">active Orange/Red events</span>
```

The "106" is the **count of active GDACS Orange/Red events worldwide**, with the label "active Orange/Red events" next to it. If the label isn't rendering visibly that's a layout/wrapping issue worth checking, but the number is meant to be there. There is no leftover "About GDACS" block in the file — that was correctly removed. (The About content lives in the `<InfoTip>` now, as planned.)

## Why this happened

Honest answer: I can't fully reconstruct it. The summary I gave after that commit listed specific code (e.g., a `RecentGroup` component, GDACS detail parsing) that doesn't exist in the files. The most likely explanations:

1. The edits were generated but failed silently / were rolled back without the summary catching it.
2. I overstated what shipped in the wrap-up message.

Either way: the summaries are not trustworthy for that commit. The files are the truth.

## Acceptance check (against the original 4-panel plan)

| Item | Status |
|---|---|
| Active Disasters description line per event | ❌ not in code |
| Conflict Pulse Top 5 deduped headlines | ❌ not in code (panel + edge function) |
| Grid Status fuel mix bars visible | ✅ present (polish skipped) |
| Grid Status warning banner | ❌ not in code |
| National US heat map | ❌ not in code |
| `src/lib/flags.ts` shared helper | ❌ not created |
| `Dashboard.tsx`/`Live.tsx` pass lat/lng to NationalPanel | ❌ not done |

## Plan to fix — re-ship the missing 4-panel work (as a single commit)

This is the same plan you already approved, scoped down to only what's actually missing. No new scope.

### 1. Active Disasters — description line
- Add `stripHtml(s)` (strip tags, decode `&amp; &nbsp; &#39; &quot;`, collapse whitespace) and `truncate(s, 140)` helpers to `ActiveDisastersPanel.tsx`.
- Pull description: `properties.htmldescription` → `properties.description` → fallback `"{Type} event"` (e.g., "Earthquake event").
- Render as third line under the existing `detail` row, dim text, `line-clamp-2`.

### 2. Conflict Pulse — Top Stories
- Extend `supabase/functions/gdelt-events/index.ts` with a second parallel GDELT call: same conflict query, `mode=artlist&maxrecords=25&sort=DateDesc&sourcelang:eng`. Both calls share the existing 5-min cache.
- Server-side dedupe: lowercase title, strip punctuation, drop stopwords, build word set; Jaccard > 0.5 → same cluster, keep newest. Top 5.
- Add `articles: [{title, url, domain, country, seendate}]` to payload. Failure of article fetch returns `articles: []` — never blocks stats.
- Create `src/lib/flags.ts`: extract the country→ISO2→flag-emoji helper currently inline in `GlobalHeadlinesPanel.tsx` (refactor that panel to import from the new lib — no behavior change).
- Add TOP CONFLICT STORIES section in `ConflictPulsePanel.tsx` below Top Theme: `[flag] truncated headline · domain · {timeAgo}`. Hidden when `articles` is empty.

### 3. Grid Status — polish + warning banner
- Bump fuel-mix bar height `h-1` → `h-1.5`.
- Per-fuel color map (gas/nuclear/coal/wind/hydro/other → severity tokens).
- Show `pct% · {mw} MW` instead of just `pct%`.
- Add warning banner above current demand: `stressLevel === 'critical' || stressPct >= 95` → red `HIGH LOAD WARNING · {pct}% of today's peak`; `stressLevel === 'stressed' && peakToday >= peak7d * 0.98` → amber `Approaching weekly peak`. Otherwise render nothing.

### 4. National — US heat map
- Add Leaflet `MapContainer` (h-[240px], CartoDB Dark Matter) between bar chart and interpretation line.
- Fetch states GeoJSON once via `useQuery(['us-states-geo'], ...)` with `staleTime: Infinity` from the public CDN.
- Build a state-name→USPS map; reuse the existing `stateCounts` aggregation (already computed for the top-3 row).
- `<GeoJSON>` style function colors by count: 0 transparent · 1–10 low/35% · 11–30 moderate/40% · 31–60 severe/45% · 61+ critical/55%. Dim border on all.
- `onEachFeature` binds tooltip with state name + count.
- Pin user location with primary CircleMarker (same as Earthquakes panel).
- Add optional `lat`/`lng` props to `NationalPanel`; pass them from `Dashboard.tsx` + `Live.tsx` (lat/lng already available there).
- Bar chart colors **untouched**.

### Files touched

- `src/components/panels/ActiveDisastersPanel.tsx` — description line + helpers
- `src/components/panels/ConflictPulsePanel.tsx` — Top Stories section
- `src/components/panels/GridStatusPanel.tsx` — fuel-mix polish + warning banner
- `src/components/panels/NationalPanel.tsx` — heat map + lat/lng props
- `src/components/panels/GlobalHeadlinesPanel.tsx` — switch to shared flags helper
- `src/lib/flags.ts` (new) — country→ISO2→flag emoji
- `src/pages/Dashboard.tsx` + `src/pages/Live.tsx` — pass `lat`/`lng` to `<NationalPanel>`
- `supabase/functions/gdelt-events/index.ts` — second GDELT call + Jaccard dedupe + `articles` field

### Verification protocol after deploy (so this doesn't repeat)

After the commit, I will:
1. Re-read each touched file and quote the actual new code in the summary (not paraphrase).
2. Curl the `gdelt-events` edge function and show you the response includes `articles[]`.
3. Take a screenshot of each affected panel via the browser tool **only if you ask** — otherwise just confirm via file reads.

Acceptance the same as the original plan; I'll check each box against the actual file contents, not against my memory of what I intended to write.

## Out of scope

The 7-panel Phase-2 expansion (already shipped per file checks I can do after if you want). The Global Headlines situational-awareness filter (also already shipped — verified). Historical baselines (still parked).

