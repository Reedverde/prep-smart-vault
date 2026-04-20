---
name: Future Enhancements
description: Specced but not-yet-built dashboard features, parked for future sessions
type: feature
---

# Future Enhancements (parked)

## Commit 4 — Grid regions map (deferred)

**Goal:** Add a small US map to the Grid Status panel showing each balancing-authority (BA) region colored by current demand vs. recent baseline, so the user can see at a glance whether stress is concentrated regionally (e.g. Texas heatwave, PJM cold snap) rather than a single national number.

**Why deferred:** BA geography is not a clean state/county overlay — BA service territories overlap states in irregular ways. A correct rendering needs either (a) the EIA's official BA shapefile (large, ~5MB GeoJSON, would need static-asset bundling and simplification), or (b) a hand-curated approximation with ~12 major BAs as labeled circles on a US outline. Option (b) is faster but less honest. Decision needs its own session with mockup review.

**Sketch of approach:**
- New tab inside `GridStatusPanel` (Demand / Fuel Mix / Map) — keep existing panel layout
- Pull all BA demand series from EIA via `eia-grid` proxy (currently PJM-only; expand the function to fetch the top 12 BAs in one batch)
- Compute each BA's `currentDemand / 7day-rolling-mean-at-this-hour` ratio
- Color: <0.95 calm green · 0.95–1.05 normal · 1.05–1.15 elevated yellow · >1.15 stressed red
- Render as Leaflet map (reuse CartoDB Dark Matter tiles from EarthquakesPanel) with either GeoJSON polygons (option a) or labeled CircleMarkers (option b)
- Click a BA → drill-down popup showing 24h demand vs. baseline mini-chart

**Open questions for that session:**
1. Polygons (honest) or circles (fast) — review mockups
2. Should the existing PJM-only fuel mix become "selected BA" fuel mix tied to map selection?
3. Does the EIA hourly endpoint support batch BA queries efficiently, or do we need parallel fetches + caching?
4. How does this affect the `eia-grid` 503 graceful-degradation path?

## Kp 3-day trend (parked)

The Space Weather panel currently shows a 24-sample sparkline of recent Kp values. A more useful view would be a 3-day trend showing diurnal cycles + storm onsets. SWPC publishes a 3-day forecast endpoint we could overlay (dashed line for forecast vs. solid for observed). Parked because it's pure polish — current sparkline is functional. Revisit if/when we add a dedicated Space Weather detail page.
