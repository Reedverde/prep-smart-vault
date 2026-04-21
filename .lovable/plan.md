

# Plan — NASA Space: tell me what it means

Single panel edit. Add an interpretation header + fix the misleading "CLOSE" badge + tighten labels. No new data, no API changes.

## Problem

The panel shows raw counts (0 flares, 34 CMEs, 5 NEOs at 0.27–0.68 LD) and slaps a red **CLOSE** badge on every NEO under 1 Lunar Distance. That makes a totally normal week look like an asteroid emergency. There is no plain-English verdict telling you whether to care.

## Part 1 — "Status Today" verdict block (top of panel)

Add a compact summary box above the two metric tiles that reads the data and renders **one sentence + one color** answering "should I care right now?"

Logic (computed in the component):

- **Flare verdict** — based on strongest class in last 7d:
  - none / A / B → "Sun is quiet"
  - C-class → "Background activity, no impacts"
  - M-class → "Moderate flares — possible brief radio blackouts"
  - X-class → "Strong flare(s) — GPS/HF radio disruption likely"
- **CME verdict** — count thresholds:
  - 0–10 → "Low CME activity"
  - 11–25 → "Typical CME activity"
  - 26+ → "Elevated CME activity — watch Space Weather panel for Kp"
- **NEO verdict** — closest miss distance:
  - min > 5 LD → "No notably close passes"
  - 1–5 LD → "Routine close passes (well outside Moon's orbit)"
  - 0.05–1 LD → "Close pass inside lunar orbit — tracked, no impact risk"
  - < 0.05 LD (≈20,000 km) → "Very close pass — within geosynchronous orbit altitude"

Rendered as:

```
TODAY'S READ
☀ Sun: quiet           ·  no flares above background
🌬 CMEs: typical (34)  ·  watch Kp if Earth-directed
☄ Asteroids: routine   ·  closest 0.27 LD (~104,000 km), no risk
```

Each row colored low/moderate/severe/critical via existing severity tokens. Uses existing `font-mono` and color classes — no new design tokens.

## Part 2 — Fix the misleading CLOSE badge

Replace the single red `< 1 LD = CLOSE` badge with a 3-tier system that matches actual risk:

- `< 0.05 LD` (inside geosynchronous orbit) → red **VERY CLOSE** badge
- `0.05–1 LD` (inside lunar orbit) → amber **INSIDE LUNAR** badge
- `1–5 LD` → no badge, just the distance
- `> 5 LD` → dim text, no badge

Also add a km readout next to LD (e.g. `0.27 LD · 104,000 km`) so the number is tangible. Most users don't internalize "Lunar Distance" but do internalize kilometers.

## Part 3 — Tighten the metric tiles

- "Solar Flares (7d)" tile: when count is 0, replace the bare `0` with `0` + small dim text "background only" so it doesn't look broken / missing data.
- "CMEs (7d)" tile: add a small dim qualifier underneath: `low` / `typical` / `elevated` based on the same thresholds as the verdict.

## Part 4 — Section headers with intent

- Rename `NEAR-EARTH APPROACHES` → `CLOSEST PASSES THIS WEEK` (clearer that it's a top-5 sorted list, not "incoming threats").
- Keep the existing scrollable "About" block at the bottom unchanged — it's the reference; the new top block is the "right now" verdict.

## Files touched

- `src/components/panels/NasaPanel.tsx` — add verdict block, replace CLOSE badge logic, tighten tile copy, rename section header

## Acceptance

- [ ] Top of panel shows a 3-line "Today's Read" with sun / CMEs / asteroid verdicts in plain English
- [ ] NEO badges are tiered: VERY CLOSE (red, <0.05 LD), INSIDE LUNAR (amber, 0.05–1 LD), none above 1 LD
- [ ] NEO rows show both LD and km
- [ ] Solar Flares tile shows "background only" when count is 0
- [ ] CMEs tile shows low/typical/elevated qualifier
- [ ] "About" reference block at bottom still present and unchanged
- [ ] No console errors

## Out of scope

Forecast of upcoming flares · Earth-directed CME filtering (DONKI doesn't reliably tag this) · Adding new data sources · Changes to Space Weather panel

