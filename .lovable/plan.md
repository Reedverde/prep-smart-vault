## Fix the broken /pi scale-to-fit

The previous attempt left the stage unscaled and off-center. The HUD shows up in the bottom-right of the viewport instead of fitting and centering.

## Root causes

1. `--pi-scale` is set on `document.documentElement` (the `<html>` element). Even though custom properties inherit, the `transform: scale(var(--pi-scale, 1))` on `.pi-stage` is rendering at the fallback `1` in practice — likely a paint timing / cascade issue with `transform` reading the variable before paint.
2. `display: grid; place-items: center` on `.pi-root` with a child that's *larger than the container at layout time* (stage is 1600×900 in layout even when transformed) doesn't reliably center the visual result. The child lays out at its natural 1600×900 and the transform happens after.

## Fix

### `src/pages/Pi.tsx`
- Use a `useRef` on the `.pi-stage` div.
- In the resize `useEffect`, compute the scale and set it directly on `stageRef.current.style.transform = scale(s)` (not via CSS variable). This guarantees the transform is applied synchronously to the actual element.
- Drop the documentElement custom-property write.

### `src/styles/pi.css`
- Keep `.pi-root` as full-viewport, but use this combo for reliable centering of an overflow-hidden, transform-scaled child:
  - `position: fixed; inset: 0; overflow: hidden;`
  - Center the stage with absolute positioning:
    - `.pi-stage { position: absolute; left: 50%; top: 50%; width: 1600px; height: 900px; transform: translate(-50%, -50%) scale(1); transform-origin: center center; }`
  - Then in JS, set `transform = translate(-50%, -50%) scale(${s})` so we keep both the centering translate and the dynamic scale in one transform string.
- Remove the now-unused `--pi-scale` fallback and the `display: grid; place-items: center` on `.pi-root` (revert to no flex, since stage is absolutely positioned).

## Result
- Stage is always centered horizontally and vertically.
- Stage scales from any viewport (phone to 4K) via the smaller of `vw/1600` and `vh/900`.
- Black letterbox bars appear in whichever dimension has leftover space.
- No layout regression inside the stage — every tile renders at its original 1600×900 design size, just visually scaled.
