---
name: New panels phase 2
description: 7 new panels (radar, HWO, scanner, fuel, FRED, power outages, Cloudflare Radar) added in 3 new dashboard rows
type: feature
---

# Phase 2 dashboard expansion (19-panel structure)

Added rows 5-7 below the existing 4 rows. Existing 12 panels untouched.

## Row 5 — LOCAL WEATHER DEEP DIVE
- **SevereRadarPanel** — Leaflet + NEXRAD tile overlay from Iowa Mesonet (`mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913`). Client-direct. Cache-busts via `key={tick}` every 5 min. Keyless.
- **HazardousOutlookPanel** — NWS HWO product via `nws-hwo` edge function. Two-step lookup: points → office (cwa) → HWO product list → product text. Parses `.DAY ONE`, `.DAYS TWO THROUGH SEVEN`, `.SPOTTER INFORMATION STATEMENT`. Risk classifier: tornado/damaging→high, severe→elevated, thunderstorm/wind→watch, else clear. 30-min cache.
- **ScannerAudioPanel** — Static. Broadcastify feed 33610 (Lawrence County). Tune-In button only (no iframe — Broadcastify blocks framing). No refresh.

## Row 6 — MARKETS & INFRASTRUCTURE
- **FuelPricesPanel** — `eia-fuel` edge fn. Series `EMM_EPMR_PTE_R10_DPG` (Central Atlantic) + `EMM_EPMR_PTE_NUS_DPG` (US avg), 12 weeks. Spike flag: |wow|>5% OR |4w|>10%. Uses existing `EIA_APP_KEY`. 1-hr cache.
- **FinancialStressPanel** — `fred-stress` edge fn. STLFSI4 (52w) + VIXCLS + T10Y2Y + MORTGAGE30US. Level: <-1 low, <0 below, <1 normal, <2 elevated, ≥2 high. Needs `FRED_API_KEY`. 1-hr cache.
- **PowerOutagesPanel** — `power-outages` edge fn. Best-effort scrape of FirstEnergy/Penelec Kubra summary JSON. Defensive: graceful "unavailable" banner if scrape fails. 5-min cache. Severity: 0=clear, <1000=localized, ≥1000=widespread. Keyless.

## Row 7 — INTERNET & COMMS
- **InternetHealthPanel** — `cloudflare-radar` edge fn. 3 parallel calls: `/radar/http/timeseries`, `/radar/attacks/layer7/summary`, `/radar/attacks/layer7/top/locations/target`. Computes traffic delta vs baseline, attack level (low/med/high). Needs `CLOUDFLARE_RADAR_API_TOKEN`. 15-min cache.

## Secrets
- Existing: `EIA_APP_KEY`, `CLOUDFLARE_RADAR_API_TOKEN`, `FRED_API_KEY` (all already present per `<secrets>` listing at deploy time)
- Missing-secret behavior: edge fn returns 503 + `{notConfigured:true, key:"NAME"}`; panel shows dim "Configure NAME in secrets to enable" — no crash, siblings unaffected.

## Known fragility
- **power-outages**: Kubra URL is hardcoded; FirstEnergy occasionally restructures. Panel degrades to "unavailable" banner — never throws. Logs failure for tuning.
- **cloudflare-radar**: response shape varies; helper functions check multiple paths defensively.
- **NEXRAD tiles**: third-party. If down, the base map still renders.

## Layout
Same `xl:grid-cols-3 xl:auto-rows-fr` per row, `display: contents` toggle for desktop/mobile. Row 7 has 1 panel — leaves 2 grid cells empty at xl per spec.
