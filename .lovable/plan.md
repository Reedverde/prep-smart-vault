## Goal

Make the weather and NASA Space surfaces feel more "Pip-Boy CRT": add a phosphor-green weather icon + moon phase to local weather, and embed the live NASA SDO sun image into the NASA Space panel. Apply on both `/dashboard` panels and the `/pi` kiosk tiles.

## New shared utilities

**`src/lib/moonPhase.ts`** (new)
- `getMoonPhase(date = new Date())` — astronomical formula (Jean Meeus simplified) returning:
  - `phase`: 0–1 fraction through synodic cycle
  - `name`: New / Waxing Crescent / First Quarter / Waxing Gibbous / Full / Waning Gibbous / Last Quarter / Waning Crescent
  - `illumination`: 0–100% of disk lit
  - `emoji`: 🌑🌒🌓🌔🌕🌖🌗🌘
- Pure, no deps, accurate to ~1 day. Works offline on the Pi.

**`src/components/WeatherIcon.tsx`** (new)
- Inline SVG, monochrome `currentColor` (so it inherits phosphor green).
- Variants picked from NWS short-forecast text: `sun`, `clear-night`, `partly-cloudy`, `cloudy`, `rain`, `tstorm`, `snow`, `fog`, `wind`.
- Drawn on a faint dotted/grid background (Pip-Boy style) using a `<pattern>` of 2px dots — same look as Pi tiles.
- Helper `iconForForecast(text, isNight)` maps NWS text → variant.
- Props: `variant`, `size`, optional `withGrid` (default true).

**`src/components/MoonBadge.tsx`** (new)
- Small inline SVG moon disc rendered with a phase-cut (two arcs) so the lit fraction is geometrically correct, in phosphor green on the same dotted grid.
- Caption: `WAXING GIBBOUS · 78%` in mono uppercase.

## WeatherPanel (`src/components/panels/WeatherPanel.tsx`)

Insert a new row above the big temperature:

```text
[ICON 64px on grid]   72°F   PARTLY CLOUDY        [MOON 40px]  WAXING GIBBOUS · 78%
```

- Left: `WeatherIcon` chosen from `data.observed.shortForecast || data.period.shortForecast`. Night detection via `data.period.isDaytime`.
- Right: `MoonBadge` with phase name + illumination %.
- Use `text-accent` (CRT green) for icons.
- Existing temperature, stats grid, forecast, context box untouched.

## NasaPanel (`src/components/panels/NasaPanel.tsx`)

Add a small live sun image to the "Today's Read" verdict block, top-right corner:

- 80×80 rounded `<img>` with `src = https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg?b={bucket}` (10-min cache-buster, identical pattern to SpaceWeatherPanel).
- `onError` hides the image gracefully (state `sunFailed`).
- Caption underneath: `SDO · 193Å` in `text-[10px] text-dim`.
- Layout: re-flow "Today's Read" header into a flex row so the image floats right of the three verdict lines.

## Pi kiosk tiles (`src/pages/Pi.tsx` + `src/components/PiTile.tsx`)

**PiTile** — extend props to accept an optional `icon?: ReactNode` rendered top-right of the tile body, sized ~32px, using the existing phosphor-green palette and the same dotted-grid background as the weather icon.

**Pi.tsx** weather tile (`weatherTile`):
- Add `icon: <WeatherIcon variant={...} size={32} />`.
- Append moon glyph + illumination to the `sub` line:
  `partly cloudy · wind 8mph · 🌖 78%`
  (uses Unicode moon char so the existing tile text rendering doesn't need changes; keeps it dense.)

No changes to data hooks or edge functions.

## File changes summary

- New: `src/lib/moonPhase.ts`
- New: `src/components/WeatherIcon.tsx`
- New: `src/components/MoonBadge.tsx`
- Edit: `src/components/panels/WeatherPanel.tsx` — add icon + moon row
- Edit: `src/components/panels/NasaPanel.tsx` — add SDO sun image to Today's Read
- Edit: `src/components/PiTile.tsx` — accept optional `icon` prop
- Edit: `src/pages/Pi.tsx` — pass weather icon + moon glyph into weatherTile
