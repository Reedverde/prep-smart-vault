

# Plan — Energy & Supply Costs panel

Expand the existing single-indicator Fuel Prices panel into a 5-indicator Energy & Supply Costs panel. Single commit. Builds on `eia-fuel` and `FuelPricesPanel.tsx`.

## Files touched

1. `supabase/functions/eia-fuel/index.ts` — extend to 4 EIA series
2. `supabase/functions/freightos-fbx/index.ts` — new
3. `src/components/panels/EnergyCostsPanel.tsx` — new (replaces FuelPricesPanel.tsx)
4. `src/components/panels/FuelPricesPanel.tsx` — delete
5. `src/hooks/useDataSources.ts` — extend `useEiaFuel`, add `useFreightosFbx`
6. `src/pages/Dashboard.tsx` + `src/pages/Live.tsx` — swap import + name
7. `.lovable/memory/features/dashboard-panels.md` — reflect rename

## Edge function — `eia-fuel`

Replace single-series fetch with parallel fetch of 4 series. Each series wrapped in try/catch so one failure → that key returns `null` while the others still ship.

Series IDs and EIA endpoints:
- **Gasoline** — `EMM_EPMR_PTE_R10_DPG`, `petroleum/pri/gnd/data` (existing, keep)
- **Diesel** — `EMD_EPD2D_PTE_R10_DPG`, `petroleum/pri/gnd/data` (weekly)
- **Heating oil** — `W_EPD2F_PRS_R10_DPG`, `petroleum/pri/wfr/data` (weekly residential, Northeast)
- **Natural gas** — `RNGWHHD` (Henry Hub spot), `natural-gas/pri/fut/data` (daily). Fetch ~60 daily rows, then aggregate to last-of-week buckets, take 12 weekly points.

Helper `computeStats(rowsAsc)` returns `{ latest, prior, wow, wowPct, fourWeekPct, spike, series, latestPeriod }` so all four indicators share one shape. `spike = |wowPct| > 5 || |fourWeekPct| > 10`.

National gasoline avg (`EMM_EPMR_PTE_NUS_DPG`) preserved as `nationalGas.latest`.

Final payload:
```ts
{
  gasoline:   { latest, prior, wow, wowPct, fourWeekPct, spike, series, latestPeriod, unit: 'USD/gal' } | null,
  diesel:     { …same shape, unit: 'USD/gal' } | null,
  naturalGas: { …same shape, unit: 'USD/MMBtu' } | null,
  heatingOil: { …same shape, unit: 'USD/gal' } | null,
  nationalGas:{ latest, latestPeriod } | null,
  fetchedAt
}
```
1-hour cache for the whole payload (unchanged). 503 `notConfigured` path for missing `EIA_APP_KEY` (unchanged).

## New edge function — `freightos-fbx`

Freightos has no documented free JSON endpoint. Strategy:
1. Try discovered endpoints in order, keep first 2xx JSON: `https://fbx.freightos.com/api/weekly-rates.json`, `https://fbx.freightos.com/api/index/global`, `https://terminal49.com/freightos-baltic-index/data.json` (mirror).
2. Parse to `{ period, value }[]` (12 weeks asc) — handle multiple shapes defensively (look for `data`, `series`, or array of `{date, price}`).
3. Compute the same `computeStats` shape as EIA series.
4. On total failure (all endpoints non-2xx or unparseable): return `{ status: 'unavailable', message, attempted: [...] }` with HTTP 200 and log first 300 chars of each attempt for future tuning.

JWT-validated via shared `requireUser`. 1-hour cache for successes only.

```ts
// success
{ global: { latest, prior, wow, wowPct, fourWeekPct, spike, series, latestPeriod, unit: 'index' }, fetchedAt }
// failure
{ status: 'unavailable', message: 'FBX public feed not found', attempted: ['url1','url2','url3'] }
```

Honest expectation: Freightos may serve no public JSON. The panel must remain useful with 4 indicators when FBX returns `unavailable` — the row shows "data unavailable" inline; cluster signal computes from the 4 working ones.

## Hook changes — `useDataSources.ts`

- `useEiaFuel(refreshMs)` — unchanged signature; consumers receive new wider shape (only the EnergyCostsPanel reads it).
- `useFreightosFbx(refreshMs)` — `callEdge('freightos-fbx')`, same retry/staleTime pattern as `useEiaFuel`.

## Panel component — `EnergyCostsPanel.tsx`

Header:
- Title: `ENERGY & SUPPLY COSTS`
- Source: `EIA + Freightos · weekly`
- InfoTip copy: "Tracks 5 related cost indicators. Gasoline/diesel reflect fuel markets. Natural gas drives heating and grid electricity. Heating oil is a direct household cost in PA. Freightos tracks global container freight — when shipping rates spike, grocery prices often follow in 4-6 weeks."

Body: 5 compact rows rendered by a single `<IndicatorRow>` subcomponent. Layout per row using flex:

```text
┌─────────────────────────────────────────────────────────┐
│ Gasoline   $3.89/gal   +$0.04 wow   ▁▂▂▃▄▄▄▅▅▆▆▇   ⚠   │
└─────────────────────────────────────────────────────────┘
```

Implementation:
- Label (`text-xs`, fixed `w-24`)
- Value `font-mono tabular-nums` + unit (`text-[11px] text-dim`)
- WoW delta colored: up = `text-severity-severe`, down = `text-severity-low`, flat = `text-dim`. Format as `±$0.04` for $-units, `±0.12` for index, `±0.05` for MMBtu.
- 60×24px Recharts sparkline (`ResponsiveContainer` inside fixed-width div)
- Warning icon (lucide `AlertTriangle`, h-3 w-3, `text-severity-moderate`) only when `indicator.spike === true`
- If indicator is `null` or `unavailable`: render single dim line "data unavailable" spanning value/sparkline area

Below the 5 rows:
- Thin `border-t border-border/60` divider
- National gas avg comparison line (preserved): `National gas avg: $X.XX`
- Cluster signal pill computed from `flaggedCount = indicators.filter(i => i?.spike).length` and `allUp = working indicators all wow > 0`:
  - 0–1 flagged → `bg-severity-low/15 text-severity-low`, "Normal — no supply stress"
  - 2 flagged → `bg-severity-moderate/15 text-severity-moderate`, "Mixed signals — monitor"
  - 3+ flagged AND allUp → `bg-severity-critical/15 text-severity-critical`, "Broad inflationary pressure"
  - 3+ flagged otherwise → `bg-severity-severe/15 text-severity-severe`, "Multiple indicators elevated — supply chain stress likely"
- ContextBox: "Weekly cadence. EIA updates Mondays; Henry Hub aggregated from daily. FBX is global container freight — leading indicator for grocery costs."
- `UpdatedAgo`

Loading: `PanelSkeleton rows={6}`. Error (whole-payload fail): `PanelError`. `notConfigured` (eia-fuel 503): existing ConfigureNotice.

## Dashboard.tsx / Live.tsx

In both files, replace:
```ts
import { FuelPricesPanel } from "@/components/panels/FuelPricesPanel";
…
<FuelPricesPanel key="fuel" refreshMs={60 * 60 * 1000} />
```
with:
```ts
import { EnergyCostsPanel } from "@/components/panels/EnergyCostsPanel";
…
<EnergyCostsPanel key="energy" refreshMs={60 * 60 * 1000} />
```
Position in `MARKETS & INFRASTRUCTURE` row unchanged.

## Memory update

Update `.lovable/memory/features/dashboard-panels.md` row for Fuel Prices → `Energy & Supply Costs | EnergyCostsPanel | EIA (gasoline/diesel/natgas/heating oil) + Freightos FBX | eia-fuel + freightos-fbx proxies`.

## Acceptance check after deploy

1. Quote actual `payload` object construction from `eia-fuel/index.ts` showing all 5 keys
2. Quote actual `<IndicatorRow>` JSX from `EnergyCostsPanel.tsx`
3. Quote cluster-signal computation
4. Confirm panel renders with FBX in either success or `unavailable` state without breaking the other 4 rows
5. Confirm no console errors and neighboring panels (FinancialStress, PowerOutages) unaffected

## Out of scope

CPI, food prices, metals, electricity LMP, historical baselines, panel reordering.
