

# Diagnosis report — three panel issues

Verification protocol: each finding below quotes the actual file/log/response. No paraphrasing.

---

## 1. Grid Status — fuel mix bars: code is correct, **upstream data is empty**

### Code is shipped (not the bug)

`GridStatusPanel.tsx` lines 146–168 do render fuel-mix bars with the colored width div. Quoted verbatim:

```tsx
<div className="space-y-1.5">
  <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Fuel mix</div>
  {Object.entries(data.mix || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 6)
    .map(([fuel, mw]: any) => {
      const pct = data.mixTotal ? (mw / data.mixTotal) * 100 : 0;
      ...
      return (
        <div key={fuel} className="font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="text-foreground truncate">{fuel}</span>
            ...
          </div>
          <div className="h-1.5 bg-inset rounded overflow-hidden mt-0.5">
            <div className={`h-full ${fuelColor(fuel)}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    })}
</div>
```

My audit two messages ago was correct here — the bars are in the file. (I owe you correction on the *polish* side: per-fuel colors, MW values, h-1.5 bars, and warning banner are also all present. That's good news.)

### Why no bars render — live edge response:

```json
"mix": {},
"mixTotal": 0,
"mixPeriod": null
```

`data.mix` is an empty object, so `Object.entries(...)` yields zero iterations and renders only the "Fuel mix" header. There is no bug in the panel — the EIA fuel-type-data endpoint is returning zero rows for PJM right now.

### Likely cause in `eia-grid/index.ts`

Line 35 builds the mix URL with `start=${fmtHour(dayAgo)}&end=${fmtHour(now)}` (24h window) and `length=100`, then line 98 filters to only the single most-recent period. EIA's `fuel-type-data` for PJM publishes with a multi-hour delay; if the latest 24h window contains no published rows yet, `mixRows` is empty and `mix` ends up `{}`. The exact root cause needs a logged dump of `mixJson?.response?.data?.length` and `latestPeriod` to confirm — could also be a facet name change (some EIA endpoints use `respondent` vs `region`) or a delay bigger than 24h on weekends.

### Proposed fix (one commit)

1. In `eia-grid/index.ts`: widen the mix window to 7 days (still take only the latest period), and on empty add a fallback to the "all" respondent or another working PJM facet. Log `mixRows.length` + `latestPeriod` so we can see what's happening.
2. In `GridStatusPanel.tsx`: when `mixTotal === 0`, show a dim "Fuel mix data delayed by EIA — refreshes hourly" line under the header instead of nothing. No silent empty section.

---

## 2. Global Headlines — empty feed: **GDELT rejects the query as too long**

### Edge function response (live curl, MISS):

```json
{ "items": [], "fetchedAt": "2026-04-22T06:03:08.596Z" }
```

### Edge function log (latest):

```
gdelt-headlines: { fetched: 0, excluded: 0, remaining: 0, reasons: {}, tagCounts: {}, otherPct: 0 }
```

`fetched: 0` proves the issue is **upstream**, not the exclusion regexes. (Exclusion logic is innocent — nothing is being filtered because nothing arrives.)

### Direct GDELT call with the exact query the function sends:

```
$ curl '...api.gdeltproject.org/api/v2/doc/doc?query=(protest OR ... OR "oil prices") sourcelang:english&...'
Your query was too short or too long.
```

GDELT's `doc 2.0` API has an undocumented query-length cap. The current query is **486 chars** with **38 OR-terms including 8 quoted phrases**. GDELT rejects it with a plain-text error. The function then `JSON.parse`s the HTML/text and gets `{}`, so `articles = []`, fetched = 0, and the panel shows "No recent headlines."

A trimmed query (verified working in my probe — first article was the Trump Media CEO story) succeeds when reduced to ~17 keywords / no quoted phrases.

### Proposed fix

Trim the query to the highest-signal terms and drop multi-word quoted phrases (replace with the single rare token):

```
(war OR conflict OR protest OR invasion OR coup OR sanctions OR ceasefire OR
 election OR diplomatic OR summit OR cyberattack OR ransomware OR breach OR
 terrorism OR bombing OR missile OR airstrike OR blockade OR embargo OR
 recession OR inflation OR tariff OR OPEC) sourcelang:english
```

23 terms, no quoted phrases, well under the limit. We lose precision on `"drone strike"`/`"trade war"`/`"oil prices"`/`"currency crisis"`/`"bank run"`/`"sovereign default"` but each had a single-word substitute already in the list (`airstrike`, `tariff`, `OPEC`, `inflation`, `bank`/dropped, `recession`).

Also harden the function against future GDELT errors:

- If the response body isn't valid JSON, log the first 200 chars (so we see "Your query was too long" instead of silently emptying), and serve stale cache when present.

---

## 3. Power Outages — FirstEnergy Kubra endpoint: **404, dead URL**

### Edge function log:

```
power-outages: kubra responded 404
```

### Direct probe of the URL hardcoded in `power-outages/index.ts`:

```
$ curl -I 'https://kubra.io/data/8a4ee61b-1cb9-46ad-bc26-2b7c45d6ba61/public/summary-1/data.json'
HTTP/2 404
content-type: application/xml
server: AmazonS3
```

### Probe of FirstEnergy's outage page itself:

```
$ curl -I 'https://www.firstenergycorp.com/outages.html'
HTTP/2 302
location: /page_not_found.html
```

The HTML page also redirects to a 404. FirstEnergy reorganized their outage portal at some point after the original implementation. The Kubra UUID we hardcoded is no longer the active dataset. Discovering the new UUID requires loading their current outage map in a real browser and inspecting XHRs (the page is JS-rendered and the JSON URL is built at runtime from a config endpoint).

### Proposed approach (lower-risk than another scrape)

Switch the data source to **PowerOutage.us**, a free public aggregator that already does the work of collecting from FirstEnergy + every other utility. Their public web API returns state and county counts as JSON without auth. If that endpoint also doesn't behave, fall back to the existing graceful "unavailable" banner — no crash either way.

Specifically: rewrite `power-outages/index.ts` to:

1. Try `https://poweroutage.us/api/web/states` for PA total + Lawrence County row. Cache 5 min.
2. On any failure, return the existing `{status:'unavailable', ...}` payload so the panel keeps its current dim state.
3. Log the response status + first 200 chars on failure for future tuning.

If PowerOutage.us turns out to also be unscriptable from a Deno function (CF challenge, etc.), I'll report back rather than ship a broken fallback. Worst case we mark the panel "deferred — needs browser-based scrape" and move on.

---

## What I'd ship in a single commit (after your approval)

1. **Grid Status** — `eia-grid/index.ts`: widen mix window to 7d, log `mixRows.length` + `latestPeriod`. `GridStatusPanel.tsx`: dim "Fuel mix data delayed by EIA" line when `mixTotal === 0`.
2. **Global Headlines** — `gdelt-headlines/index.ts`: trim query to 23 terms, drop quoted phrases; log the first 200 chars of any non-JSON response.
3. **Power Outages** — `power-outages/index.ts`: swap Kubra URL for PowerOutage.us state/county API; preserve graceful fallback.

No panel/UI changes other than the one Grid Status copy line. Out of scope: anything else.

