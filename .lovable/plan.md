

# Three-Commit Plan v2 (Revised)

Two refinements applied: rejected dual-render, picked best column-major layout, committed to Top Theme. Everything else unchanged from v1.

---

## Refinement 1 — Layout (best column-major option)

**Picked layout** — leads with Alerts → Weather on mobile, keeps gauges adjacent on desktop:

```text
Col 1: Alerts,        Weather,       Earthquakes,    Conflict Pulse
Col 2: Space Weather, Air Quality,   National,       Active Disasters
Col 3: Grid Status,   NASA,          Global Headlines, System Health
```

**Read across rows on desktop:**
```text
Row 1: Alerts        · Space Weather · Grid Status
Row 2: Weather       · Air Quality   · NASA
Row 3: Earthquakes   · National      · Global Headlines
Row 4: Conflict Pulse · Active Disasters · System Health
```

**Mobile (`columns-1`)** flows column-major: Alerts → Weather → Earthquakes → Conflict Pulse → Space Weather → Air Quality → National → Active Disasters → Grid Status → NASA → Global Headlines → System Health. Alerts and Weather lead. ✓

**What's preserved:**
- Alerts top-left (most-prominent slot — tornado warning beats temperature)
- Weather directly below Alerts (Col 1 row 2)
- **Gauges adjacent**: Space Weather (Col 2 row 1) and Air Quality (Col 2 row 2) sit on top of each other — adjacency in masonry is satisfied vertically as well as horizontally
- NASA below Air Quality (Col 2 row 2 → Col 3 row 2 — NASA still in the gauge band)
- Earthquakes (chart panel) anchors Col 1 row 3, with National and Global Headlines completing the chart+stats row
- Row 4 keeps the three "overview/meta" panels together

**What's sacrificed (partially):**
- Hero row no longer reads as "local-immediate triplet" (Weather/Alerts/Grid Status). Instead Row 1 is Alerts + Space Wx + Grid Status — a mix of immediate-local-threat and infrastructure/atmosphere. Row 2 is Weather + Air Quality + NASA — a "current ambient conditions" row. This is a coherent regrouping, not chaos: Row 1 = "what's threatening right now", Row 2 = "what the conditions are right now".

**Why this beats your draft:** your draft put Air Quality in Col 1 row 1 and split the gauges into Col 1 vs Col 2. This version keeps both gauges in Col 2 stacked vertically — masonry adjacency still reads as a gauge cluster.

**Why this beats the original v1 layout:** v1 had Weather in Col 1 row 1, which forced the dual-render hack to get Alerts on top for mobile. This costs nothing on mobile (Alerts naturally leads) and only mildly reorders the desktop hero.

---

## Refinement 2 — Top Theme: INCLUDED

Checked `supabase/functions/gdelt-events/index.ts`. The response payload is `{ count, byRegion, byType, from, to }`. `byType` already buckets articles by keyword (Protest/Conflict/Violence/Unrest/Other) — that's exactly the "top theme" data. The existing `GlobalPanel` already renders `topType` from this.

**Conflict Pulse will include Top Theme.** No edge function changes needed; data is already in the payload.

---

## Refinement 3 — Commit 3 acceptance checklist

Before deleting `GlobalPanel.tsx`, verify all of:

- [ ] `ConflictPulsePanel` renders with live GDELT data (not loading, not error)
- [ ] Conflict Pulse shows: Conflict Index label + colored severity + explanation subtitle + 7d article count + Top region + Top theme
- [ ] `ActiveDisastersPanel` renders with live GDACS data (not loading, not error)
- [ ] Active Disasters shows: count of currently-active Orange/Red events + list of up to 5 with type, location, alert level pill
- [ ] Both panels work on mobile viewport (single column, no overflow, tap targets work)
- [ ] InfoTips render on both
- [ ] Refresh buttons work on both
- [ ] No console errors

Only after all check: delete `GlobalPanel.tsx` in the same commit.

---

## Commit 1 — Global Headlines

Unchanged from v1. Summary:

- New edge function `supabase/functions/gdelt-headlines/index.ts` (keyless, 5-min cache, stale-on-failure, 1-req/5-sec respect). Query `(protest OR conflict OR violence OR unrest OR cyberattack OR coup OR invasion OR strike OR blockade)`, 6h timespan, 50 records max, server-side classify (CYBER → COUP → INVASION → CONFLICT → VIOLENCE → PROTEST → UNREST → OTHER), dedup by `${domain}::${title.slice(0,80).toLowerCase()}`, return top 10 newest.
- New hook `useGdeltHeadlines(refreshMs)` (15-min floor)
- Rename `NewsPanel.tsx` → `GlobalHeadlinesPanel.tsx`. Title `GLOBAL HEADLINES`, source `GDELT · last 6h`. Row: TAG pill (red/orange/yellow/dim by severity) + 🇫🇷 country + right-aligned relative time + clickable headline second line (line-clamp-2).
- Inline ~40-country name→ISO2 map for emoji flags; unknown countries get no flag.
- Deprecation comments on `news-feed/index.ts` and `useNewsFeed`.
- Drop `NewsPanel` import + `resolveStateCode` + state-code maps from `Dashboard.tsx`.
- **CISA: dropped entirely** (rationale unchanged from v1).
- Update `mem://features/dashboard-panels`.

## Commit 2 — Earthquake map

Unchanged from v1. Summary:

- Add `leaflet` + `react-leaflet` to package.json.
- Import `leaflet/dist/leaflet.css` in `EarthquakesPanel.tsx`.
- Insert 200px-tall map between stat boxes and bar chart. CartoDB Dark Matter tiles. CircleMarkers per quake (radius 3/5/7px and gray/yellow/red by M2.5–4 / M4–5 / M5+, opacity 0.7), Popup with magnitude + place + USGS link. User location CircleMarker (primary color, 8px, "Your location" tooltip).
- `EarthquakesPanel` accepts `lat, lng` props from Dashboard.
- Scroll-zoom off (no page-scroll hijack), pan/drag/zoom controls on.

## Commit 3 — Layout reorg + Global Situation split + masonry

**Split GlobalPanel into two panels:**

`ConflictPulsePanel.tsx` — GDELT only, reuses `useGdeltEvents`:
- Title `CONFLICT PULSE` · Source `GDELT · 7d`
- Conflict Index label (HIGH/ELEVATED/NORMAL) with severity color
- Subtitle (existing `conflictExplanation` logic moves here)
- 7d articles count
- Top region (from `byRegion`)
- **Top theme** (from `byType`) ✓
- InfoTip explaining the index

`ActiveDisastersPanel.tsx` — GDACS only, reuses `useGdacs`:
- Title `ACTIVE DISASTERS` · Source `GDACS · live`
- Count of currently-active Orange/Red events
- List of up to 5 most severe: short type label (EQ/FL/TC/VO/DR/WF), short location, alert level pill (Orange/Red colored)
- Each row clickable → GDACS event URL
- InfoTip explaining Orange = humanitarian impact likely, Red = severe

**Layout:**
- `<div className="columns-1 md:columns-2 xl:columns-3 gap-4">` container
- Each panel wrapped `<div className="break-inside-avoid mb-4">`
- JSX in column-major order per the new layout (Col 1: Alerts/Weather/Earthquakes/Conflict Pulse; Col 2: Space Weather/Air Quality/National/Active Disasters; Col 3: Grid Status/NASA/Global Headlines/System Health)
- JSX comment block above container documents column-major mapping

**No mobile dual-render.** Mobile flows naturally column-major and leads with Alerts → Weather. ✓

**Acceptance checklist** (above) must pass before `GlobalPanel.tsx` is deleted in this commit.

**Memory updates:**
- `mem://features/dashboard-panels`: 12-panel structure, three rows of three plus row 4 of three. Note Global Situation split into Conflict Pulse + Active Disasters. New layout section with column-major masonry note.
- `mem://future-enhancements` (new): Grid Status BA map (PJM/ERCOT/MISO/CAISO/NYISO/SPP), Space Weather 3-day Kp trend.

---

## Files touched per commit

**Commit 1:**
- `supabase/functions/gdelt-headlines/index.ts` (new)
- `supabase/functions/news-feed/index.ts` (deprecation comment)
- `src/hooks/useDataSources.ts` (`useGdeltHeadlines` added, `useNewsFeed` deprecated)
- `src/components/panels/GlobalHeadlinesPanel.tsx` (new)
- `src/components/panels/NewsPanel.tsx` (deleted)
- `src/pages/Dashboard.tsx` (swap import, drop state-code helpers)
- `mem://features/dashboard-panels`

**Commit 2:**
- `package.json` (add `leaflet` + `react-leaflet`)
- `src/components/panels/EarthquakesPanel.tsx` (add map, accept lat/lng)
- `src/pages/Dashboard.tsx` (pass lat/lng to EarthquakesPanel)

**Commit 3:**
- `src/components/panels/ConflictPulsePanel.tsx` (new)
- `src/components/panels/ActiveDisastersPanel.tsx` (new)
- `src/components/panels/GlobalPanel.tsx` (deleted after acceptance checklist passes)
- `src/pages/Dashboard.tsx` (masonry, column-major JSX)
- `mem://features/dashboard-panels`
- `mem://future-enhancements` (new)

## Out of scope

Stage 3/4/5 · GDELT threshold tuning · sun viz · design tokens · Grid Status BA map (parked) · Space Weather Kp trend (parked) · removing the deprecated `news-feed` function and `useNewsFeed` hook code (follow-up after verification)

