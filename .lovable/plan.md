## Goal

Replace the broken Gannett scrape with direct fetches from PA's electric utilities, and redesign the panel to mirror the PowerOutage.com layout you shared.

## Why the current panel is broken

I confirmed `data.tcpalm.com` (our current source) and `poweroutage.us` itself both return **403 Cloudflare blocks** when called from our edge function. The panel has been silently failing every fetch — it just shows 0 customers and a stale tracked-count.

## Data plan — direct from the utilities

Pennsylvania's grid is ~95% covered by 4 investor-owned utilities. We hit each one's public outage feed in parallel and aggregate.

| Utility | Customers tracked | Territory |
|---|---|---|
| FirstEnergy (Penn Power, Penelec, Met-Ed, West Penn Power) | ~2.0M | NW + Central PA, **includes Lawrence County** |
| PPL Electric Utilities | ~1.4M | Eastern + Central PA |
| PECO (Exelon) | ~1.7M | Philadelphia metro |
| Duquesne Light | ~600k | Pittsburgh metro |

**Lawrence County** specifically is served by Penn Power (a FirstEnergy subsidiary), so your home-county number comes from FirstEnergy's feed.

### Implementation notes (technical)

- New edge function `power-outages-pa` replaces the old one.
- Fetch each utility's outage JSON in parallel, with per-utility try/catch so one failure doesn't blank the panel.
- For utilities behind Akamai/Cloudflare (Duquesne Light returned 403 in my probe), I'll discover the actual public JSON endpoint by inspecting their KUBRA-hosted map data feed during build. KUBRA endpoints are typically reachable; the page wrapper isn't.
- Cache 5 min fresh / 24 h stale via the existing `serveCached` helper.
- Output shape: `{ stateTotal, stateTracked, lawrenceCounty, topCounties[], byUtility[], severity, scrapedAt }`.

## Panel redesign — PowerOutage.com aesthetic

Reworked `PowerOutagesPanel.tsx` to match the reference layout:

```text
┌─ Power Outages · PA ──────────────────────── [src] ┐
│                                                    │
│  CUSTOMERS OUT       CUSTOMERS TRACKED             │
│  3,237               6,765,006                     │
│  ─────────────────────────────────────────         │
│  Lawrence County:  0   ALL CLEAR                   │
│                                                    │
│  TOP AFFECTED COUNTIES                             │
│  Lycoming      ████████████░░░  790                │
│  Carbon        ████████░░░░░░░  547                │
│  Lehigh        ████░░░░░░░░░░░  286                │
│  Franklin      ███░░░░░░░░░░░░  223                │
│  Centre        ███░░░░░░░░░░░░  217                │
│                                                    │
│  BY UTILITY                                        │
│  FirstEnergy   1,278     PPL  846                  │
│  PECO            238     DLC    0                  │
│                                                    │
│  Updated 2 min ago                                 │
└────────────────────────────────────────────────────┘
```

Key visual elements:
- **Two big stat numbers** at top (Customers Out + Customers Tracked), terminal-green for the out count, dim for tracked.
- **Lawrence County row** stays prominent with severity chip (since it's your home county).
- **Top affected counties** as a horizontal bar list — each row shows county name, a colored bar (length proportional to % of state outages), and the customer count. Bar color follows our existing severity palette.
- **By utility** breakdown — small 2-column grid showing each utility's contribution.
- All in the existing dark-terminal aesthetic, SF Mono, semantic color tokens.

Skipping a literal interactive map — adds heavy deps (maplibre + county geojson) for one panel. The bar list communicates the same "where are outages concentrated" answer in a fraction of the space and load.

## Files touched

- `supabase/functions/power-outages/index.ts` — rewrite to fetch the 4 utilities directly and aggregate
- `src/components/panels/PowerOutagesPanel.tsx` — new layout per mockup above
- `src/hooks/useDataSources.ts` — update return type if shape changes (keeps endpoint name, no client routing changes)

No DB changes, no new secrets needed.

## Risks & mitigations

- **Endpoint discovery may surface a utility I can't reach.** If one utility's feed is hard-blocked, I'll show its slice as "—" rather than break the whole panel; you'd still get state totals from the other three plus your Lawrence County number from FirstEnergy.
- **Schema drift.** Each utility could change their feed shape. Mitigated by per-utility error isolation and the 24h stale cache.

Ready to build when you approve.