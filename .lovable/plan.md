## Goal
Make `/dashboard` visually identical to `/live`, and keep them in sync going forward by sharing one layout component.

## Differences today
- `/live` uses `MoonPhasePanel` in LOCAL WEATHER DEEP DIVE; `/dashboard` uses `ScannerAudioPanel`.
- `/live` shows a "Local Scanner · Tune In" button + location header row; `/dashboard` shows only a location row.
- Otherwise identical 7 groups, identical responsive masonry grid.

## Plan

1. **Create `src/components/DashboardGrid.tsx`** — extract the shared content from `Live.tsx`:
   - Props: `lat`, `lng`, `refreshMs`, `refreshMin`, `locationName`, `headerRight?` (ReactNode for an extra header slot like the scanner button), `extraHeaderNote?` (e.g. "read-only public view").
   - Renders the location header row (with optional right-side slot) and the full 7-group masonry exactly as `Live.tsx` does today.
   - Uses `MoonPhasePanel` (matching `/live`), removing `ScannerAudioPanel` from the deep-dive group so the two pages match. The scanner stays accessible via the "Tune In" button.

2. **Update `src/pages/Live.tsx`** — replace inline groups + header with `<DashboardGrid>` plus its scanner-button `headerRight` and "read-only public view" note. Keeps `PublicTopNav`.

3. **Update `src/pages/Dashboard.tsx`** — replace inline groups + header with `<DashboardGrid>`, also passing the same scanner "Tune In" button as `headerRight` so both pages look identical. Keeps `PageContainer`/`TopNav` and the `useUserSettings` loading state.

4. **Result** — only the top nav differs (auth'd `TopNav` vs `PublicTopNav`); body is one shared component, so future panel/layout changes touch one file.

## Notes
- No changes to individual panel components or edge functions.
- `ScannerAudioPanel` import becomes unused on Dashboard; remove it. Component file stays in case it's wanted later.
- Memory file `dashboard-panels.md` will need a small update afterward to reflect MoonPhasePanel replacing ScannerAudioPanel in the deep-dive row, and the shared `DashboardGrid` wrapper.
