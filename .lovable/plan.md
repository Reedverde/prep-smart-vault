
## Goal

Fix two dashboard panels that look cramped/run-together and bring them up to a polished HUD aesthetic matching the reference images.

## 1. Financial Stress panel (`src/components/panels/FinancialStressPanel.tsx`)

Reference: image 3 (HUD circular ring with big centered number + small label below).

Current problem: the number, label "STLFSI", and surrounding ring all overlap because the ring is rendered as a separate semi/full gauge while the value sits beside metadata — everything collapses together at panel width.

New layout (top section):
- Centered circular HUD ring (~150px) using SVG. Two arcs:
  - Background track: faint purple ring (`hsl(var(--accent) / 0.15)`), 8px stroke.
  - Active arc: bright purple (`hsl(var(--accent))`), 8px stroke, with subtle outer glow (`filter: drop-shadow(0 0 8px hsl(var(--accent) / 0.6))`). Length encodes |STLFSI| mapped to 0–3 scale (clamped), starting from top (-90deg).
  - Small notch/cap at the active arc's leading end (decorative, like the reference's bright tip).
- Centered text inside the ring:
  - Big tabular number, font-mono, `text-4xl`, accent purple with text-shadow glow. Show value with sign (e.g. `-0.78`).
  - Below it, `text-[10px] uppercase tracking-[0.2em] text-dim`: `STLFSI`.
- Below the ring, a single horizontal level pill (`LEVEL_LABEL[level]`) — already styled, just relocated and given `mt-3`.

Below the gauge keep the existing 52-week sparkline + the VIX / yield curve / mortgage rows + ContextBox + UpdatedAgo, with a clear `space-y-4` gap so nothing collides.

Color: stays purple (`--accent` is already the project's purple). No palette change.

## 2. Air Quality panel (`src/components/panels/AirQualityPanel.tsx`)

Reference: image 2 (semicircle gauge made of discrete colored ticks/segments transitioning green→yellow→orange→red, with a triangular pointer indicating current value, big centered number, small category label below).

Current uses `SemiGauge` from `PanelKit` with smooth zones. Replace the gauge rendering inside this panel only (don't touch the shared `SemiGauge` so other panels are unaffected) with a custom `AqiArcGauge` subcomponent:

- SVG semicircle, 220×130, centered.
- ~26 radial tick segments arranged along the arc from 180° to 0°.
- Each tick is a short rounded rect rotated to its angle; tick color picked by the AQI bucket that tick's value falls into:
  - 0–50 green (`--severity-low`)
  - 51–100 yellow (custom, see below)
  - 101–150 orange (`--severity-severe` is already orange-ish; keep)
  - 151–300 red (`--severity-critical`)
- Inactive ticks (above current value) rendered at 25% opacity; active ticks at full opacity with subtle `drop-shadow` glow in their own color.
- Triangular pointer: small SVG triangle positioned at the active value's angle, pointing inward, fill `hsl(var(--foreground))`.
- Centered text inside arc: big AQI number (`text-5xl`, tabular, color = current bucket color, glow shadow), category label below in same color (`text-[10px] uppercase tracking-wider`).

Yellow is not currently a token; add `--severity-warn: 48 96% 53%` to `:root` (and dark override if needed) in `src/index.css` so it's reusable. Use it via a Tailwind arbitrary `hsl(var(--severity-warn))` or extend `tailwind.config.ts` colors with `severity.warn`.

Pollutant list, ContextBox, UpdatedAgo, refresh button, info tooltip: keep as is.

## Out of scope

- No data-source / hook changes.
- No changes to other panels.
- No layout/grid changes on the dashboard.

## Files touched

- `src/components/panels/FinancialStressPanel.tsx` — replace gauge/header block.
- `src/components/panels/AirQualityPanel.tsx` — replace `SemiGauge` usage with new local `AqiArcGauge`.
- `src/index.css` — add `--severity-warn` token.
- `tailwind.config.ts` — register `severity.warn` color (optional, for class usage).

