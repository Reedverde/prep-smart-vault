## Goal

Make every tile's icon + value content fill the tile, leaving only ~5% padding on every side. Right now icons sit small, centered, with lots of dead space inside each tile.

## Approach

Two complementary changes, both purely visual:

### 1. Tighten the tile body padding to a 5% inset

In `src/styles/pi.css`:
- `.pi-tile` padding: keep header/footer flush, but make `.pi-tile-body` use `padding: 5% 5%` so the content area itself has the requested inset.
- `.pi-tile-body` already centers content; with stretch where useful, content will sit inside that 5% inset on every tile.

### 2. Scale up icon + Big-text sizes to actually fill that area

The icon/text sizes in `src/pages/Pi.tsx` are hard-coded per tile (e.g. `<PiShield size={80}>`, `<Big size={42}>`, `<PiAreaChart width={290} height={48}>`). They were sized for the old layout. I'll bump them by ~35% across the board so they fill the new inset:

- All `<Big size={N}>` → multiply N by 1.35 (rounded). e.g. 42 → 56, 36 → 48, 30 → 40.
- All viz `size={N}` props (PiShield, PiMoon, PiHazardTriangle, PiGlobe, PiKpField, PiRingMeter, PiWeatherIcon) → multiply by 1.35.
- All viz `width`/`height` for charts (PiAreaChart, PiQuakeProfile, PiHistogram, PiPulseLine, PiGradBar, PiUSHeatmap, PiCellStack) → multiply by 1.35.

This keeps proportions identical, just bigger.

## Out of scope
- No changes to the 5×4 grid, the stage scaling, or any data hooks.
- No font changes other than size.
- No tile reordering.

## Result
Every tile becomes visually denser — the icon + headline value dominate the tile, with tight 5% breathing room. On small displays (which is the point), each tile reads instantly.
