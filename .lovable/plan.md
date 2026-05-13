## Goal

Make the /pi HUD readable on a 1024x600 display by scaling up text and thickening lines/strokes. The stage is a fixed 1600x900 design scaled down to the actual screen, so bumping sizes in CSS/SVG translates directly to larger pixels on the Pi screen.

## Scope

CSS-only + small SVG stroke tweaks. No layout restructuring, no logic changes, no removed elements.

## Changes

### 1. `src/styles/pi.css` — typography bumps (~+40–60%)

- `.pi-topstrip` font-size 10 → 14
- `.pi-brand` 12 → 16
- `.pi-tile-header` 9 → 13
- `.pi-tile-id` 9 → 12
- `.pi-tile-footer` 9 → 12
- `.pi-pill` 9 → 12
- `.pi-big-clock` 64 → 84
- `.pi-ticker` 10 → 14
- Default body text inside tiles: ensure `.pi-root` base font-size lifted from inherited 16 → 18 (so any unstyled inline numbers grow too)

### 2. `src/styles/pi.css` — stroke / border thickening

- `.pi-frame` border 1px → 2px
- Frame corner brackets (`::before/::after`, `.pi-corner-bl/br`) 2px → 3px, size 18 → 22px
- `.pi-tile` border 1px → 2px (all severity overrides inherit)
- `.pi-tile-corner` 1px → 2px, size 8 → 12px
- `.pi-topstrip` / `.pi-ticker` border 1px → 2px
- `.pi-glyph` ring 1 → 2px, inner dot/animated pip slightly larger
- `.pi-cursor` width 8 → 10, height 14 → 18
- `.pi-bars span` width 2 → 3
- `.pi-radar` border 1 → 2px, cross lines 1 → 2px, center dot 4 → 6
- Tile-inner faint inset border 1 → 2px

### 3. `src/pages/Pi.tsx` — SVG stroke widths

For the inline SVGs used inside tiles (gauges, rings, charts, sparklines, radar pings, weather/icons), bump `stroke-width` / `strokeWidth` values by ~1.5–2× (e.g. 1 → 2, 1.5 → 3, 2 → 3). No size or viewBox changes — strokes only, so layouts remain intact.

### Out of scope

- No changes to grid layout, tile count, colors, or animations.
- No icon swaps; lucide icon `size` props already enlarged in a previous pass.

## Verification

After edit: open /pi in preview, screenshot at 1024x600 (Pi target) and at current 1298x961, crop a couple of tiles to confirm text is readable and strokes are visibly thicker without overflow.
