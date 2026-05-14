## Plan

### 1. Air Quality gauge — thicker, glowy, segmented (image 1 reference)
File: `src/components/PanelKit.tsx` (`SemiGauge`)
- Increase `stroke` 14 → 26 and add inner radius padding so the arc stays inside the tile.
- Split each color zone into ~4 discrete segments with a 2° gap (gives the segmented "speedometer" look from the reference).
- Add an SVG `<filter>` glow (feGaussianBlur + feMerge) applied to each arc for the neon halo.
- Thicken the needle: width 2.5 → 5, length to outer edge, drop-shadow filter; hub circle r 4 → 7 with accent ring.
- Add a faint inner concentric ring (decorative) like the reference.
File: `src/components/panels/AirQualityPanel.tsx`
- Bump the centered AQI value from `text-3xl` → `text-5xl` and tighten spacing so the number sits inside the arc.

### 2 & 3. Alerts panel cut off (images 2 & 3)
File: `src/components/panels/AlertsPanel.tsx`
- The panel body overflows because the expanded "Recent" accordions push content past the panel's fixed row height.
- Wrap the alerts list in a scroll container: `max-h-[420px] overflow-y-auto pr-1` with a thin custom scrollbar.
- Keep the active alert pinned at the top (outside the scroll area) so it's always visible.

### 4. Pollutant explainers — O3, PM2.5, PM10 (image 4)
File: `src/components/panels/AirQualityPanel.tsx`
- Wrap each pollutant row's label in an `<InfoTip>` with a one-line explanation:
  - **O3** — "Ozone. Ground-level ozone irritates lungs; worse on hot sunny afternoons."
  - **PM2.5** — "Fine particles (smoke, exhaust). Penetrate deep into lungs and bloodstream."
  - **PM10** — "Coarse dust/pollen particles. Aggravate asthma and allergies."
- Tiny `?` icon next to each label, same pattern already used elsewhere.

### 5. Power Outages "unavailable" (image 5)
File: `supabase/functions/power-outages/index.ts`
- Current source (FirstEnergy/Penelec Kubra JSON) is brittle and currently broken — that's the root cause of the perpetual "unavailable" banner.
- Switch primary source to **PowerOutage.us** county-level public JSON (`https://poweroutage.us/api/web/counties?countyId=...` is private, but their state summary endpoint `https://poweroutage.us/area/state/pennsylvania` returns parseable HTML; alternative: `eaglei.geheatmap` from ORNL is gated).
- Pragmatic fix: use **EIA-930** balancing-authority hourly demand as a *grid-stress* proxy fallback (we already have `EIA_APP_KEY`), and only show the FirstEnergy banner when both fail.
- Also: increase cache `staleMaxAgeMs` so we keep showing the last good number for 24h instead of going blank.
- Update the panel copy from "temporarily unavailable" → friendlier: "Live county outage feed is unstable. Showing last known totals from {time}."

### 6. Alert-type explainers (image 6 — bar chart in National panel)
File: `src/components/panels/NationalPanel.tsx`
- Add an `InfoTip` legend at the top of the chart: hover any bar label to see what it means.
- Build a small dictionary in the same file:
  - Small Craft Advisory — winds 25–33 kt or hazardous seas; dangerous for boats < ~33 ft.
  - Red Flag Warning — critical fire weather (low humidity + wind + dry fuels).
  - Gale Warning — sustained marine winds 34–47 kt.
  - Fire Weather Watch — fire-favorable conditions possible in 12–72h.
  - High Wind Warning — sustained 40+ mph or gusts 58+ mph.
  - Flood Warning — flooding imminent or occurring.
  - Wind Advisory — sustained 31–39 mph or gusts 46–57 mph.
- Render labels with a dotted underline + tooltip; also add one combined `InfoTip` in the panel header that lists all of them.

### 7. Cloudflare "+3.4%" meaning (image 7)
File: `src/components/panels/InternetHealthPanel.tsx`
- The header already says "US traffic vs 7d avg" but it's ambiguous. Add a one-line subcaption under the number:
  > "+3.4% more US web requests than the 7-day average — normal range is ±15%."
- Expand the existing `InfoTip` to be plain-English:
  > "This shows whether US internet traffic is higher or lower than usual. Big swings (±15% or more) often signal a major outage, BGP route leak, or holiday spike."
- Add hover tooltips to the country list values explaining they are the share of layer-7 attack traffic targeting that country (% of total).

### Out of scope
- No backend schema changes.
- No new panels or layout restructuring.
- Pi kiosk view (`/pi`) not touched.

### Verification
After implementation: refresh `/dashboard`, check (a) AQI gauge visibly glows and matches reference, (b) Alerts panel scrolls cleanly when expanded, (c) all explainer tooltips render, (d) Power Outages either shows a real number or a clearer fallback message.
