

# Single Commit — Priority-Ordered Grid + Active Alerts History

## Part 1 — Layout: Four stacked grids

Replace masonry in `src/pages/Dashboard.tsx` with **four separate CSS Grid containers** stacked vertically. Each row independently sizes to its tallest panel.

```tsx
const rowGrid = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4 auto-rows-fr";

<RowLabel>LOCAL</RowLabel> {/* hidden unless ?debug=rows */}
<div className={rowGrid}>
  <WeatherPanel .../>
  <AlertsPanel .../>
  <AirQualityPanel .../>
</div>

<RowLabel>NEWS + NATIONAL</RowLabel>
<div className={rowGrid}>
  <GlobalHeadlinesPanel .../>
  <NationalPanel .../>
  <GridStatusPanel .../>
</div>

<RowLabel>WORLD</RowLabel>
<div className={rowGrid}>
  <EarthquakesPanel .../>
  <ActiveDisastersPanel .../>
  <ConflictPulsePanel .../>
</div>

<RowLabel>SPACE + SYSTEM</RowLabel>
<div className={rowGrid}>
  <SpaceWeatherPanel .../>
  <NasaPanel .../>
  <SystemHealthPanel .../>
</div>
```

**Equal heights within a row:** `auto-rows-fr` makes the single grid row track expand to the tallest panel; all children stretch to fill via the existing `Panel` component (already `flex flex-col` with `flex-1` body).

**Tablet (md, 2 cols):** each row wraps; first two side-by-side, third on a new line spanning one column.

**Mobile (<md, 1 col):** stacked in spec order: Weather → Alerts → AQ → Headlines → National → Grid → Quakes → Disasters → Conflict → Space Wx → NASA → System Health.

**Debug row labels:** `?debug=rows` query param shows uppercase row headers (`text-[10px] tracking-[0.2em] text-dim mb-1`). Off by default.

## Part 2 — Active Alerts history + expired cap

**`src/hooks/useDataSources.ts`:**
- Add `useLocalAlerts(lat, lng, refreshMs)` (replacing the old one) hitting `https://api.weather.gov/alerts?point={lat},{lng}&start={now-7d ISO}` (non-`/active` endpoint includes expired). Returns `{ active: Feature[], expired: Feature[], expiredTotal: number }` split client-side:
  - `active`: features where `ends` is missing or in the future
  - All expired sorted by `ends` desc
  - `expiredTotal = allExpired.length`
  - `expired = allExpired.slice(0, 10)` — **capped at 10**
- **Delete the old `useLocalAlerts`** and write the new one in its place (same export name). Only `AlertsPanel.tsx` uses it — no other callers exist, confirmed by grep. No rename needed; the old hook is replaced in-place.

**`src/components/panels/AlertsPanel.tsx`:**
- Destructure `{ active, expired, expiredTotal }` from the updated `useLocalAlerts`.
- **Top section:** existing rendering driven by `active` — unchanged interaction, severity border, expand/collapse.
- **Separator + Recent header:** rendered only when `expired.length > 0`. Header: `<div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim mt-3 mb-2 pt-3 border-t border-border/60">Recent · past 7 days</div>`.
- **Expired rows:** same card markup wrapped in `<div className="opacity-60">`, severity pill rendered with `level="low"` regardless of true severity (greyed look) but original severity text preserved. Timestamp reads `Ended {formatDistanceToNow(ends, { addSuffix: true })}`. Border-left uses neutral `border-l-border` instead of severity color. Click still expands.
- **Overflow line:** if `expiredTotal > expired.length`, render at the bottom of the Recent section:
  ```tsx
  <div className="text-[10px] text-dim font-mono mt-2">
    + {expiredTotal - expired.length} more this week
  </div>
  ```
- **Empty state** (no active AND no expired): existing "No active alerts" check icon — unchanged.
- **Active-empty + expired-present:** show the check icon block for active, then the Recent section below it.
- Wrap the active + recent body in `flex-1 overflow-y-auto scroll-thin -mr-1 pr-1` for internal scrolling within the grid row.

## Part 3 — SpaceWeatherPanel sun + gauge side-by-side

**`src/components/panels/SpaceWeatherPanel.tsx`:**

Replace the current vertically-stacked sun image and gauge with a flex row layout:

```tsx
<div className="flex flex-col sm:flex-row items-center justify-around gap-4">
  <div className="flex flex-col items-center gap-1.5">
    {/* existing sun image (120×120 rounded) */}
    {/* existing "Sun now · 193Å · NASA SDO" caption */}
  </div>
  <div className="flex flex-col items-center">
    {/* existing SemiGauge */}
    {/* existing "Kp X.X QUIET" readout */}
  </div>
</div>
```

- Desktop/tablet: sun left, gauge right, centered vertically
- Mobile (<640px `sm:`): stacks vertically (sun on top, gauge below) via `flex-col`
- Support rows (Aurora / HF Radio / GPS / Power Grid), sparkline, and ContextBox remain full-width below — unchanged

## Part 4 — Row-height polish

- **Row 2:** `GlobalHeadlinesPanel` currently has `max-h-[500px]` on its scroll container — change to `flex-1 overflow-y-auto scroll-thin` so it fills the row track instead of capping at 500px.
- **Row 3:** Earthquakes (with map) sets the height. Disasters/Conflict fill naturally — whitespace at bottom is fine.
- **Row 4:** Space Weather sets the height. NASA/System Health fill via grid cell stretch.

## Files touched

- `src/pages/Dashboard.tsx` — replace masonry with 4 stacked grids + optional row labels
- `src/hooks/useDataSources.ts` — replace old `useLocalAlerts` with new version (history + expired cap + expiredTotal)
- `src/components/panels/AlertsPanel.tsx` — history section, overflow line, scrollable body
- `src/components/panels/SpaceWeatherPanel.tsx` — sun + gauge side-by-side flex row
- `src/components/panels/GlobalHeadlinesPanel.tsx` — swap `max-h-[500px]` for `flex-1`
- `.lovable/memory/features/dashboard-panels.md` — new row order + alerts history + sun layout

## Acceptance (self-check before reporting)

- [ ] 4 rows x 3 panels in spec order
- [ ] Within each row, all 3 panels render at the same height (CSS Grid `auto-rows-fr`)
- [ ] Rows differ in height as content dictates
- [ ] Active Alerts shows expired alerts from past 7 days, dimmed, below current, capped at 10
- [ ] "+ N more this week" line renders when expiredTotal > 10
- [ ] "Recent" section hidden when zero expired
- [ ] Sun image and Kp gauge are side-by-side on desktop, stacked on mobile
- [ ] Mobile order: Weather first, System Health last
- [ ] Sun image, earthquake map, headline scroll, info tips, refresh buttons all still work
- [ ] Old `useLocalAlerts` hook deleted, no dead code remaining
- [ ] No console errors
- [ ] `?debug=rows` shows row labels; default URL doesn't

## Out of scope

Commit 4 (grid regions map) · Kp trend · design tokens · Stage 3/4/5 · removing deprecated `news-feed`/`useNewsFeed`.

