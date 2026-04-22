

# Plan — Six-panel quality pass

Single commit. Pure data + display improvements using current sources. No historical baselines (parked).

## 1. Active Alerts — dedupe Recent

In `AlertsPanel.tsx`, group `expired[]` by `properties.event` before rendering:

```ts
type Group = { event: string; latest: any; all: any[] };
const grouped = expired.reduce<Group[]>((acc, a) => {
  const g = acc.find(x => x.event === a.properties.event);
  if (g) { g.all.push(a); if (new Date(a.properties.ends) > new Date(g.latest.properties.ends)) g.latest = a; }
  else acc.push({ event: a.properties.event, latest: a, all: [a] });
  return acc;
}, []);
```

Render one card per group. Card title shows event + count: `Freeze Warning · 3 issuances · latest ended 14h ago`. Expanding the card lists each individual issuance (small rows: `Ended 14h ago · 12 counties`). Active section unchanged.

## 2. Global Headlines — classifier expansion

Edit `supabase/functions/gdelt-headlines/index.ts`:

- Expand existing regexes:
  - CYBER: + `malware|phishing|data leak|exploit|zero-day|ddos`
  - VIOLENCE: + `bombing|stabbing|assault|murder|massacre|ambush`
  - CONFLICT: + `offensive|missile|drone strike|skirmish|clash`
  - PROTEST: + `march|riot|blockade`
- Add 2 new tags: `ECONOMIC` (`recession|inflation|layoffs|stock crash|bank run|default`), `DISASTER` (`earthquake|hurricane|wildfire|flood|tsunami|volcano`)
- Update the `Tag` union type and the order of checks (more-specific tags first, OTHER last)
- The existing `console.log('gdelt-headlines tag distribution:', tagCounts, ...)` already logs after — re-deploy to see the new distribution

In `GlobalHeadlinesPanel.tsx` add tag styles for `ECONOMIC` (dim/low border) and `DISASTER` (dim/moderate border) to `tagStyle` + extend the `Tag` type.

## 3. National US Alerts — interpretation + top regions

In `NationalPanel.tsx`:

- Compute severity ratio: `ratio = sev / total`
  - `<0.2` → "Normal alert volume" (low color)
  - `0.2–0.4` → "Elevated severe weather" (moderate)
  - `>0.4` → "Major severe weather event nationwide" (severe)
- Compute dominant event: highest entry from `counts`. Render: `Dominant: {event} ({count})`
- Compute top 3 states from `properties.areaDesc`. NWS `areaDesc` is comma-joined (`"Allegheny, PA; Beaver, PA"`). Parse: split on `;` then `,` and take the trailing 2-letter token; tally; sort top 3.
- Layout under the StatBoxes: a one-line interpretation (colored), then `Most active: FL (87) · TX (62) · CA (54)` row. Chart unchanged.

## 4. Grid Status — stress label + peak context

Edit `supabase/functions/eia-grid/index.ts`:

- Add a request for today's hourly demand max (already inside `demandSeries` — compute `peakToday = Math.max(...demandSeries.map(d=>d.mw))`).
- Keep `peakDemand7d`. Return both: `peakToday`, `peak7d` (rename from `peakDemand7d`).
- Compute `stressPct = currentDemand / peakToday * 100` server-side and return `stressLevel: 'normal'|'elevated'|'stressed'|'critical'` (<80/<90/<95/else). Note: today's "peak" is observed-so-far if intraday; we'll label it as such.

In `GridStatusPanel.tsx`:

- Replace `HIGH LOAD` pill with a stress label colored by tier (low/moderate/severe/critical tokens), text: `NORMAL` / `ELEVATED` / `STRESSED` / `CRITICAL`.
- Below current demand, two small rows: `Peak today: 98,200 MW` and `Peak 7d: 102,400 MW`.
- Above sparkline add a tiny dim caption: `Last 24 hours`.

## 5. Active Disasters — full per-event detail

Edit `supabase/functions/...` — actually GDACS data is fetched directly client-side via `useGdacs` (not proxied). Move enrichment into the panel itself, parsing fields already in the GeoJSON properties:

GDACS `properties` includes (varies by event type): `eventtype`, `severity` (often `{ value, unit }` like magnitude), `severitydata`, `episodeid`, `fromdate`, `country`, `htmldescription`, `name`, `population`, `coordinates`. For each type build a one-line detail string:

- **EQ**: `M{severity.value} · {depth}km depth · {timeAgo} · {country/place}` (depth pulled from `severitydata.eventdetails.depth` if present, else omit)
- **TC**: `Cat {category} · {wind}kt · {country}` (category/wind from `severitydata`)
- **FL**: `Started {timeAgo} · pop ~{population.value} affected · {country}` (population field if present, else just timing)
- **VO**: `VEI {value} · {country}` (VEI from severity if present)
- **DR / WF / fallback**: `Started {timeAgo} · {country}`

`timeAgo` from `fromdate` using `formatDistanceToNow`. Defensive: every field check is null-guarded; missing pieces drop silently.

Render each row with the existing pill, plus the detail string as a second line under location:

```
[EQ]  Honshu, Japan                              [ORANGE]
      M6.2 · 30km depth · 4h ago
```

Remove the entire "About GDACS" block. Move that copy into the existing `<InfoTip>` (expanded text, scrollable inside tooltip).

## 6. Conflict Pulse — exclude OTHER + transparency

Edit `supabase/functions/gdelt-events/index.ts`:

- Bucket logic already produces `Other` for unmatched. Keep but ensure capitalization is consistent (`Other` not `OTHER`).
- No backend change strictly needed; client filters.

In `ConflictPulsePanel.tsx`:

- Filter `byType` to exclude `Other` before computing `topType`. If filtered map is empty, hide the Top Theme row entirely.
- Under the HIGH/ELEVATED/NORMAL label, replace the "Above typical global conflict news volume" line with: `Based on 7d article volume: {count} articles` (small dim).
- Move the threshold breakdown (>200 HIGH, >100 ELEVATED, ≤100 NORMAL) into the InfoTip text.
- Remove the large "About the Conflict Index" block. Move its content into the InfoTip.

## 7. Park historical baselines

Create `mem://future-enhancements/historical-baselines` with the goal/scope/sketch from the prompt verbatim, status `PARKED`. Update `mem://index.md` Memories section to reference it.

## Files touched

- `src/components/panels/AlertsPanel.tsx` — group expired by event, expandable detail
- `src/components/panels/GlobalHeadlinesPanel.tsx` — add ECONOMIC/DISASTER tag styles
- `src/components/panels/NationalPanel.tsx` — interpretation line + top states row
- `src/components/panels/GridStatusPanel.tsx` — stress label, peak rows, sparkline caption
- `src/components/panels/ActiveDisastersPanel.tsx` — per-event detail line, About → InfoTip
- `src/components/panels/ConflictPulsePanel.tsx` — exclude Other, caption, About → InfoTip
- `supabase/functions/gdelt-headlines/index.ts` — expand classifier, add ECONOMIC/DISASTER
- `supabase/functions/eia-grid/index.ts` — return `peakToday`, `peak7d`, `stressLevel`
- `mem://future-enhancements/historical-baselines` (new) + `mem://index.md` (append reference)

Edge functions deploy automatically.

## Acceptance

- [ ] Active Alerts Recent section shows one card per event type with issuance count; expanding lists each
- [ ] Global Headlines edge function logs new tag distribution; ECONOMIC/DISASTER appear; OTHER target <30%
- [ ] National panel shows colored interpretation line + dominant event + top 3 states
- [ ] Grid Status shows tiered stress label + Peak today / Peak 7d rows + "Last 24 hours" caption
- [ ] Active Disasters shows magnitude/category/timing/location per event; About block removed and in InfoTip
- [ ] Conflict Pulse Top Theme excludes Other; threshold caption visible; About block removed and in InfoTip
- [ ] `mem://future-enhancements/historical-baselines` exists and is referenced from index
- [ ] No console errors, no layout shifts

## Out of scope

30-day rolling baselines · US grid regions map · panel reordering · layout changes

