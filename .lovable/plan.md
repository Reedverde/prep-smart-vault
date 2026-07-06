Yes. It should render like your reference in geometry, not style: waning means the left side is lit, the terminator bows toward the dark right side, and 57 to 58 percent is visibly just over half filled.

I believe the remaining issue is the SVG arc path is still choosing the wrong enclosed lobe for the lit shape in the live render. The math for `ellipseRx` is now right, but the compound path can still draw the smaller crescent area when the arc sweep and path winding combine the wrong way.

Plan:

1. Change only `src/components/MoonBadge.tsx`.
2. Keep the current colors, grid, outline, text, size, and CSS behavior unchanged.
3. Replace the fragile gibbous path construction with explicit phase geometry:
   1. Waning gibbous, fill left side plus a terminator bowed right.
   2. Waxing gibbous, fill right side plus a terminator bowed left.
   3. Waning crescent, fill only the left crescent.
   4. Waxing crescent, fill only the right crescent.
4. Use the existing illumination fraction so 58 percent produces a subtle gibbous curve, like the reference screenshot, not a large crescent.
5. Do not modify moon phase calculation, moon times, panels, routes, CSS, or any other file.