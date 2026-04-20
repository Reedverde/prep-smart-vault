

# Plan — Panel polish: heights + context

Single small commit. Five panel tweaks. No new data sources, no layout changes.

## Part 1 — Global Headlines: cap height + scroll

`src/components/panels/GlobalHeadlinesPanel.tsx`

The panel currently uses `flex-1 overflow-y-auto`, so it stretches to whatever its grid row dictates (right now Grid Status is making Row 2 short). Cap the scroll area to match the reference screenshot (~640px content area, same as Active Alerts for consistency across the dashboard).

- Change the inner scroller from `flex-1 overflow-y-auto pr-1 scroll-thin` to `max-h-[640px] overflow-y-auto pr-1 scroll-thin -mr-1`
- Outer wrapper drops `flex-1 flex flex-col` → just `space-y-2`
- Result: panel renders all ~25 headlines, scrollable inside a fixed 640px window, matches the visual density in the screenshot

## Part 2 — Active Disasters: scrollable explainer section

`src/components/panels/ActiveDisastersPanel.tsx`

Currently shows count + top 5 + one-line ContextBox. Add a scrollable "About GDACS" section below the event list with real explanatory content the user can read.

- Replace the single `ContextBox` with a `max-h-[180px] overflow-y-auto scroll-thin` block titled "About GDACS"
- Content covers: what GDACS is, what each alert color means (Green/Orange/Red), event type abbreviations (EQ=earthquake, TC=tropical cyclone, FL=flood, VO=volcano, DR=drought, WF=wildfire), how soon alerts appear after an event, and that Green minor events are filtered out

## Part 3 — Conflict Pulse: scrollable explainer section

`src/components/panels/ConflictPulsePanel.tsx`

Same treatment. Replace the one-line ContextBox with a scrollable explainer.

- "About the Conflict Index" — what GDELT scans, how the index is computed (7-day article volume on conflict/protest/violence themes), what HIGH/ELEVATED/NORMAL thresholds mean, what "Top region" and "Top theme" represent, caveats (volume reflects news *coverage*, not necessarily ground-truth event severity)
- `max-h-[180px] overflow-y-auto scroll-thin`

## Part 4 — Space Weather: rich explainer section

`src/components/panels/SpaceWeatherPanel.tsx`

Replace single-line ContextBox with a scrollable "About Space Weather" block.

- What the Kp index measures (planetary geomagnetic disturbance, 0–9 scale, updated every 3h by NOAA SWPC)
- What the sun image shows (193Å EUV channel from NASA SDO, ~1 million °C corona, dark patches = coronal holes, bright regions = active flare sites)
- Why it matters: each row (Aurora, HF Radio, GPS, Power Grid) explained — what's affected and at what Kp level
- `max-h-[200px] overflow-y-auto scroll-thin`

## Part 5 — NASA Space: rich explainer section

`src/components/panels/NasaPanel.tsx`

Replace single-line ContextBox with scrollable "About NASA DONKI + NEO" block.

- DONKI = Database of Notifications, Knowledge, Information (NASA's space weather event log)
- Solar flare classes: A < B < C < M < X (logarithmic, X is most powerful, can disrupt radio/GPS)
- CMEs (Coronal Mass Ejections): billions of tons of plasma; if Earth-directed, can drive geomagnetic storms 1–3 days later (links to Kp on the Space Weather panel)
- NEO = Near-Earth Object. LD = Lunar Distance (≈384,400 km). "Close" flag = within 1 LD. Context: anything outside 1 LD has zero impact risk for that pass
- `max-h-[200px] overflow-y-auto scroll-thin`

## Files touched

- `src/components/panels/GlobalHeadlinesPanel.tsx` — cap scroll height at 640px
- `src/components/panels/ActiveDisastersPanel.tsx` — replace ContextBox with scrollable explainer
- `src/components/panels/ConflictPulsePanel.tsx` — replace ContextBox with scrollable explainer
- `src/components/panels/SpaceWeatherPanel.tsx` — replace ContextBox with scrollable explainer
- `src/components/panels/NasaPanel.tsx` — replace ContextBox with scrollable explainer

## Acceptance

- [ ] Global Headlines renders at ~640px tall on desktop, scrolls internally, matches screenshot density
- [ ] Active Disasters has a readable scrollable "About" section explaining alert colors and event types
- [ ] Conflict Pulse has a readable scrollable explainer covering methodology and caveats
- [ ] Space Weather explainer covers Kp scale, sun image, and what each impact row means
- [ ] NASA Space explainer covers flare classes, CMEs, and LD/NEO terminology
- [ ] Row 2 and Row 4 row-height equalization still works (panels stretch to tallest in row; new explainers fit comfortably in existing space)
- [ ] No console errors

## Out of scope

Layout changes · new data sources · Commit 4 (grid regions map) · design tokens

