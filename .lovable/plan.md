

# Plan — Tablet (md) layout: continuous 2-col flow

Layout-only fix in `src/pages/Dashboard.tsx`. Going with **Option A**: collapse the 4 row-grids into a single 2-col grid at `md`, restore the 4 separate row-grids at `xl`. Row labels become full-width section headers at `md` so the logical groupings stay readable.

## Approach

Tailwind doesn't let one element be "4 separate grids at xl, 1 grid at md." So we render **both** structures and toggle visibility by breakpoint:

- **`xl` and up**: the existing 4-row-grid structure (3 cols, `auto-rows-fr` per row) — unchanged.
- **`md` to `xl-1`**: a single flat 2-col grid containing all 12 panels in reading order, with row labels as `col-span-2` section headers between groups.
- **`<md`**: the same flat structure collapses to 1 column (the labels still render; they're cheap and helpful on mobile too since we already render one panel per "row" anyway — but per spec mobile is "unchanged," so we'll keep labels gated by `?debug=rows` like today).

Wrap each structure in a container with `hidden xl:block` / `xl:hidden` to swap them at the breakpoint. Panels are stateless components reading from hooks, so rendering them in two trees has no behavioral cost — React mounts only the visible one's effects per breakpoint? Actually both trees mount. To avoid double-fetching, we keep ONE tree and swap the grid CSS instead.

**Better approach**: render panels once, in a single flat list, and use CSS to switch between "4 separate 3-col grids" at xl and "one 2-col grid" at md. This is doable with `display: contents` on row wrappers at md (so children promote to the parent grid) and normal grid behavior at xl.

```text
<div class="xl:grid xl:grid-cols-3 xl:gap-4 grid grid-cols-1 md:grid-cols-2 gap-4">
  <RowLabel>LOCAL</RowLabel>                    // col-span-full at md, hidden at xl
  <div class="contents xl:grid xl:col-span-3 xl:grid-cols-3 xl:auto-rows-fr xl:gap-4 xl:mb-4">
    <Weather/> <Alerts/> <AirQuality/>
  </div>
  ...repeat for 4 groups
</div>
```

Wait — `display: contents` + nested `grid` toggle is brittle across browsers for grid-row equalization. Cleaner: use the **dual-render approach** but mount panels only once via a shared list.

## Final implementation

Build the panel list once as an array of `{ label, panels: [JSX, JSX, JSX] }`. Then render two trees, one visible per breakpoint:

```tsx
const groups = [
  { label: "LOCAL", panels: [<WeatherPanel.../>, <AlertsPanel.../>, <AirQualityPanel.../>] },
  { label: "NEWS + NATIONAL", panels: [<GlobalHeadlinesPanel.../>, <NationalPanel.../>, <GridStatusPanel.../>] },
  { label: "WORLD", panels: [<EarthquakesPanel.../>, <ActiveDisastersPanel.../>, <ConflictPulsePanel.../>] },
  { label: "SPACE + SYSTEM", panels: [<SpaceWeatherPanel.../>, <NasaPanel.../>, <SystemHealthPanel.../>] },
];
```

This DOES double-mount panels (each panel JSX expression evaluates once but is rendered in both trees). To avoid that, use a CSS-only toggle on a single tree.

**Cleanest single-tree solution** — `display: contents` IS reliable for our case (we don't need row equalization at md, only at xl):

```tsx
// Outer wrapper: behaves as 1-col on mobile, 2-col grid at md, NOT a grid at xl (block)
<div className="grid grid-cols-1 md:grid-cols-2 xl:block gap-4 xl:gap-0">
  {groups.map(g => (
    <>
      {/* Label: spans both cols at md, hidden at xl unless debug */}
      <RowLabel className="md:col-span-2 xl:hidden">{g.label}</RowLabel>
      <DebugRowLabel className="hidden xl:block">{g.label}</DebugRowLabel>
      {/* Row wrapper: contents at md (children flow into outer grid), 3-col grid at xl */}
      <div className="contents xl:grid xl:grid-cols-3 xl:gap-4 xl:auto-rows-fr xl:mb-4">
        {g.panels}
      </div>
    </>
  ))}
</div>
```

At `md`: the inner `div` is `display: contents`, so the 3 panel children promote into the outer 2-col grid, flowing continuously. The label sits as a `col-span-2` header before each group's panels.

At `xl`: the outer `div` is `block`, the inner `div` becomes a 3-col grid with `auto-rows-fr` for equal heights — exactly today's behavior. Labels render only when `?debug=rows`.

At `<md` (mobile): outer is 1-col grid, `display: contents` still works (children stack vertically), labels appear before each group as section headers (or stay hidden — keeping current behavior of debug-only).

## Row label behavior

- **Desktop (xl)**: hidden unless `?debug=rows` (current behavior preserved)
- **Tablet (md to xl-1)**: always shown as `col-span-2` section headers — gives the user the logical grouping back since they no longer get visual row breaks
- **Mobile (<md)**: always shown as full-width section headers — same reasoning; helpful navigation

Two label components: `<DesktopDebugLabel>` (hidden xl:block, debug-gated) and `<MobileTabletLabel>` (block xl:hidden, always shown). Same text, different visibility rules.

## Files touched

- `src/pages/Dashboard.tsx` — restructure into a single `groups` array + dual-mode wrapper using `display: contents` toggle

No changes to any panel component, no changes to PageContainer, no new CSS tokens.

## Acceptance

- [ ] Desktop (≥1280px / xl): identical to today — 4 rows × 3 cols, `auto-rows-fr` per row, labels only with `?debug=rows`
- [ ] Tablet (768–1279px / md): all 12 panels flow as continuous pairs in a single 2-col grid, group labels appear as full-width headers between groups
- [ ] Mobile (<768px): single column stack with group labels as section headers
- [ ] Panel reading order top-to-bottom matches: Weather → Alerts → AirQuality → GlobalHeadlines → National → GridStatus → Earthquakes → ActiveDisasters → ConflictPulse → SpaceWeather → NASA → SystemHealth
- [ ] No double-fetching (panels mount once)
- [ ] No console errors

## Out of scope

Panel internals · row equalization at md (panels size to their content, not equal heights — acceptable per spec) · changing the xl breakpoint value · replacing the 7" Pi display layout with a custom kiosk mode

