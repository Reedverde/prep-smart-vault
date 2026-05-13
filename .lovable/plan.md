## Goal

Make the `/pi` kiosk dashboard fit any screen — phone, tablet, laptop, desktop, big TV — without changing the 5×4 grid layout or any tile content. The whole HUD scales as one unit so it always fills the viewport.

## Approach

Design the dashboard at one fixed "design size" (e.g. 1600×900) and use a CSS `transform: scale()` on a wrapper to shrink or grow it to whatever the actual viewport is. Pure CSS + a tiny resize hook — no device sniffing, no per-tile rework.

### Why scale-to-fit (your pick)
- Zero layout regressions: every tile, font, chart, and corner stays pixel-identical, just zoomed.
- Works on every device width automatically — phones get a tiny but complete dashboard, big TVs get a giant one.
- Aspect-ratio aware: if the screen is wider than the design ratio, we scale by height; if taller, we scale by width. The HUD is then centered with letterboxing in the leftover space (matches the kiosk aesthetic).

## Changes

### 1. `src/styles/pi.css`
- Split `.pi-root` into two layers:
  - **`.pi-root`** — full-viewport black background, `display: grid; place-items: center;` (acts as the letterbox).
  - **`.pi-stage`** (new inner wrapper) — fixed `width: 1600px; height: 900px;` carrying everything that's currently inside `.pi-root` (frame, grid, tiles).
- Apply `transform: scale(var(--pi-scale, 1))` and `transform-origin: center` to `.pi-stage`.
- Add a CSS media query fallback (`@media (orientation: portrait)`) that rotates nothing but ensures the scale math still hits both dimensions.

### 2. `src/pages/Pi.tsx`
- Wrap the existing children in a new `<div className="pi-stage">`.
- Add a small `useEffect` that:
  - Measures `window.innerWidth / 1600` and `window.innerHeight / 900`.
  - Picks the smaller ratio (so the stage always fits inside the viewport).
  - Writes it to `--pi-scale` on the stage element.
  - Re-runs on `resize` and `orientationchange`.
- ~15 lines of code, no new dependencies.

### 3. Touch-friendliness (free win)
- Add `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` to `.pi-root` so taps on phone don't trigger zoom/highlight. No layout impact.

## Out of scope
- No tile reflow, no compact mobile variants, no hidden content on small screens.
- No device/OS detection — pure viewport-driven CSS + one resize listener.
- No changes to `/dashboard`, `/live`, auth, archive, or nav.

## What you'll see after

- Open `/pi` on a phone → entire HUD shrinks to fit, centered, with thin black letterbox bars.
- Resize the browser → HUD smoothly rescales in real time.
- 4K display → HUD scales up sharp (it's a transform, so no blur on text/SVG).
- The 1539×825 preview you're on now → scales to ~96%, basically full-bleed.

## Risks / notes
- Hit areas (clicks, hover) still work correctly under `transform: scale` — browsers map events to the visual position.
- `position: fixed` elements inside the stage are unaffected (there aren't any in `/pi` today).
- If you later want a true mobile-native layout, we can add it as a `@media (max-width: 600px)` override that switches off the transform and uses a stacked grid — but that's a separate plan.
