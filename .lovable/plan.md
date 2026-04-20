

# Execution Plan — Commits 2 & 3

Per approved Plan v3. Two distinct commits, no squash. Self-check after each.

## Commit 2 — Earthquake map

1. Add `leaflet@^1.9.4` and `react-leaflet@^4.2.1` (React 18 compatible).
2. `EarthquakesPanel.tsx`:
   - Accept new props `lat: number; lng: number`
   - Import `leaflet/dist/leaflet.css`
   - Insert 200px-tall `MapContainer` between stat boxes and bar chart
   - CartoDB Dark Matter tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
   - `scrollWheelZoom={false}`, drag/zoom on
   - One `CircleMarker` per quake: radius `mag>=5?7:mag>=4?5:3`, color `severity-critical/moderate/dim`, opacity 0.7, with `Popup` (M + place + USGS link)
   - User-location `CircleMarker` (primary, radius 8) with `Tooltip` "Your location"
3. `Dashboard.tsx`: pass `lat={lat} lng={lng}` to `EarthquakesPanel`.

**Self-check (Commit 2 acceptance):**
- Map renders with dark tiles
- Quake circles colored & sized by magnitude
- Popups open with USGS link
- User pin renders at correct lat/lng
- No page-scroll hijack
- Mobile tap/drag works
- No console errors

## Commit 3 — Layout reorg + Global split + Sun image

1. **New `ConflictPulsePanel.tsx`** — uses `useGdelt`. Conflict Index label/color, explanation subtitle, 7d articles count, Top region, Top theme, InfoTip.
2. **New `ActiveDisastersPanel.tsx`** — uses `useGdacs`. Count of active Orange/Red events, list of up to 5 (type abbreviation + location + alert pill, clickable to GDACS URL), InfoTip.
3. **`SpaceWeatherPanel.tsx`** — add 120×120 rounded SDO sun image above gauge with 10-min cache-buster, `onError` → hide block, caption "Sun now · 193Å · NASA SDO".
4. **`Dashboard.tsx`** — replace grid with `columns-1 md:columns-2 xl:columns-3 gap-4` masonry. Each panel wrapped in `break-inside-avoid mb-4`. JSX in column-major order:
   - Col 1: Alerts, Weather, Earthquakes, ConflictPulse
   - Col 2: SpaceWeather, AirQuality, National, ActiveDisasters
   - Col 3: GridStatus, NASA, GlobalHeadlines, SystemHealth
5. **Delete `GlobalPanel.tsx`** only after self-check passes.
6. **Memory:** update `mem://features/dashboard-panels` (12-panel structure, masonry, sun image); create `mem://future-enhancements` with Commit 4 BA-map spec + Kp 3-day trend.

**Self-check (Commit 3 acceptance):**
- ConflictPulse renders live data with all six elements
- ActiveDisasters renders count + up-to-5 list with alert pills
- Sun image loads at 120×120 rounded with caption
- Sun `onError` fallback hides block, gauge still renders
- Mobile column-major flow leads Alerts → Weather
- InfoTips + refresh buttons work on both new panels
- No console errors

## Commit 4 — DEFERRED

Specced in `mem://future-enhancements`. Not started.

## Reporting

After both commits land, describe final layout (12 panels in 4×3 desktop / single-column mobile masonry) so user can verify against mockup without opening the app.

