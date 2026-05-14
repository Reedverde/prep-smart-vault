## What I found

I audited every hook the `/pi` page reads against the current edge-function payloads (the same payloads `/dashboard` and `/live` panels use). The grid is **mostly correctly wired** — but Power Outages has a real bug, plus a couple of small staleness issues worth tightening.

### Confirmed bugs

1. **Power Outages tile reads the wrong field** (`src/pages/Pi.tsx`)
   - Pi reads `outageData?.lawrence?.customers`
   - Edge function actually returns `lawrence: { customersOut, customersTracked }` (matches `PowerOutagesPanel`)
   - Result: the big number on the kiosk is **always 0**, even during a real outage. Severity still works (it reads `outageData.severity`), but the headline number is dead.

2. **Power Outages tile ignores upstream-unavailable state**
   - When the scrape fails, the function returns `{ status: 'unavailable', state: null, lawrence: null, severity: 'clear' }`.
   - Pi will silently render `0` and `all clear · firstenergy` in that case. Should show `—` and a "feed unavailable" footer like `/dashboard` does.

### Minor staleness / nits (worth fixing while we're in there)

3. **Severe Radar tile** footer is hardcoded `"no echoes · iowa mesonet"` — it doesn't actually reflect data, so it lies during real storms. Either drop the "no echoes" claim or wire it to `localAlerts`/HWO signal so it isn't misleading.

4. **Hazard Out tile** footer falls back to a hardcoded `"tstorm thu/fri · pbz"` when `hwoData?.office` is missing. Should be a neutral fallback (e.g. `nws · 7d outlook`).

5. **Fuel tile** footer is hardcoded `"padd 1b · weekly · eia"` and severity is hardcoded `"green"` even when the price is high. Low priority, but the dashboard panel shows WoW-driven coloring; we could mirror that.

6. **Fin Stress tile** — values look correct (`stlfsi.latest`), but the footer string `"below avg" / "elevated"` is computed from a single threshold and doesn't match the new 5-band level (`low / below / normal / elevated / high`) the panel now uses. Easy to align with the same `LEVEL_LABEL` map.

### Verified correct (no change needed)

- Weather, Local Alerts, Air Quality (AQI gauge), National Alerts heatmap, PJM Grid Load, Conflict Pulse, Quakes, Headlines, Internet Health (incl. `notConfigured` handling), Disasters/GDACS, Kp/Space Weather, Moon, System/Clock — all field names match the current hook payloads.

## Plan

Single-file edit to `src/pages/Pi.tsx`:

1. **Outages — fix data field + unavailable state**
   ```text
   outageCust    = outageData?.lawrence?.customersOut ?? 0
   outageUnavail = outageData?.status === 'unavailable'
   footer        = outageUnavail ? 'feed unavailable · firstenergy'
                                 : `${outageSeverity || 'all clear'} · firstenergy`
   big number    = outageUnavail ? '—' : outageCust.toLocaleString()
   ```
   Color the number red/yellow/green from `outageSev` (currently always green).

2. **Severe Radar footer** — change hardcoded "no echoes" to something honest like `iowa mesonet · live` (no claim about echoes).

3. **HWO footer fallback** — replace `"tstorm thu/fri · pbz"` with `"nws · 7d outlook"` when no office.

4. **Fuel footer/severity** — drive severity from `fuelWow` (e.g. `> +0.10` → yellow), keep label dynamic.

5. **Fin Stress footer** — use the same 5-band label set the panel uses, derived from `data.stlfsi.level` if present, falling back to threshold.

No edge-function changes, no hook changes, no styling changes beyond color tokens already in `pi.css`. Visuals (gauges, rings, bars) stay as-is.

## Out of scope

- Refactoring `PiViz` components.
- Touching `/dashboard` or `/live`.
- Adding new data sources or new tiles.
