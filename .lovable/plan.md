## Goal

Shrink the **NWS Active Alerts · Local** panel and place a new **Moon Phase** panel beside it, sharing the middle column of the LOCAL row. Weather and Air Quality stay unchanged.

## Layout change (Live + Pi)

LOCAL row stays `xl:grid-cols-3`, but the middle slot becomes a vertical stack:

```text
┌───────────┬─────────────────┬───────────┐
│  Weather  │  Alerts (top)   │   Air     │
│           │  Moon  (bottom) │  Quality  │
└───────────┴─────────────────┴───────────┘
```

- Wrap `<AlertsPanel>` and a new `<MoonPhasePanel>` in a `flex flex-col gap-4` container so they share one grid cell and split the height.
- Alerts panel gets a tighter max-height (≈ 320 px instead of 640) so the Moon panel has room.
- On mobile/tablet (below `xl`) the two simply stack like the rest of the panels — no special handling needed.

## New component: `src/components/panels/MoonPhasePanel.tsx`

Uses the existing `Panel` chrome and the existing `MoonBadge` SVG. Shows:

- Large `MoonBadge` (size ≈ 96) with phase name + % illuminated.
- **Tonight's moonrise / moonset** for the configured lat/lng (local time, formatted `h:mm a`).
- Days until next **Full Moon** and next **New Moon** (small dim line, useful filler context).
- Standard `UpdatedAgo` + `InfoTip` ("Geocentric phase. Rise/set times computed locally — no network call.").

## Moon rise/set calculation

Add a small pure helper `src/lib/moonTimes.ts` (no new deps). Algorithm:

- Iterate the moon's altitude every 10 min over a 24 h window centered on local midnight using a Meeus-based moon position (RA/Dec → altitude using observer lat/lng/LST).
- Detect zero-crossings of `(altitude − refraction)` to find rise (negative→positive) and set (positive→negative).
- Return `{ rise: Date | null, set: Date | null, alwaysUp, alwaysDown }`.

Accuracy ≈ ±2 min, fully offline, ~80 lines. Avoids adding `suncalc` so the bundle stays clean and the Pi-offline guarantee holds.

## Files touched

- **new** `src/lib/moonTimes.ts` — moon rise/set calc
- **new** `src/components/panels/MoonPhasePanel.tsx` — panel using `MoonBadge` + rise/set
- **edit** `src/pages/Live.tsx` — restructure LOCAL group to stack Alerts + Moon in middle column
- **edit** `src/pages/Pi.tsx` — mirror the same change so the kiosk view matches
- **edit** `src/components/panels/AlertsPanel.tsx` — reduce inner `max-h-[640px]` to `max-h-[320px]` so the shared column fits both panels evenly

## Out of scope

- No backend / edge function work (calculation is local).
- No changes to other rows or panels.
- No new memory entry needed (purely a visual rearrangement of existing dashboard panels).