# PrepPi — PROJECT STATE

Last updated: 2026-06-08

## Module Manifest

| # | Module | Intensity | Status |
|---|--------|-----------|--------|
| 1 | Stability | Standard | GAP: No error boundary, no crash screen, no error logging table |
| 2 | Security | Light | Covered: RLS on all 5 tables, requireUser gate on edge functions |
| 3 | Accessibility | None | Intentionally skipped (single user kiosk) |
| 4 | Data & Backend | Standard | Covered: 5 tables, 12 edge functions, RLS |
| 5 | Auth & Accounts | Light | Covered: email/password + anon kiosk key |
| 6 | Design System | Standard | Covered: HSL tokens, pi.css kiosk tokens, Pip Boy/CRT aesthetic |
| 7 | Performance | Standard | Partial: React Query 24h cache. Missing Lighthouse baseline |
| 8 | SEO | None | Intentionally skipped (dashboard app) |
| 9 | Analytics | None | Intentionally skipped (single user) |
| 10 | Email & Notifications | Light | Schema supports channels, no delivery worker |
| 11 | Compliance & Legal | None | Intentionally skipped (personal project) |
| 12 | Discovery & Planning | Standard | Documented in Hub card |
| 13 | Testing | Light | Vitest configured, ~0% coverage |
| 14 | Documentation | Standard | PROJECT_STATE.md + PROJECT_DOCS.md + Hub card. Repo cleaned of deprecated code 2026-06-07 |
| 15 | Graceful Degradation | Heavy | CRITICAL GAP: dead feed renders as healthy green bar |
| 16 | Loading/Empty/Error States | Standard | Gap: no systematic tile failure pattern |
| 17 | Environment & Secrets | Standard | Covered: all keys in Supabase Secrets |
| 18 | Responsive & Mobile | Light | Covered for intended use (desktop + kiosk) |
| 19 | Backup & Recovery | Light | Supabase platform default |
| 20 | Rate Limiting | None | Intentionally skipped (no public write endpoints) |
| 21 | Observability | Light | Edge function console logs only |
| 22 | Cost of Ownership | Light | Free tier only, $0 run rate |
| 23 | Resource Guardrails | Light | 12 edge functions calling external APIs |

### PrepPi Specific Modules

| Module | Intensity | Status |
|--------|-----------|--------|
| Hardware & Kiosk | Heavy | Pi 3 at ceiling. Plan: ride as is, repurpose as WROLPi node, build on Pi 5 8GB |
| Data Sources & Upstreams | Heavy | 15+ sources with varying key requirements and failure modes |
| Upstream Health & Feed Monitoring | Standard | Staleness thresholds per source needed |
| Glance Surface Design Principles | Standard | Documented in project knowledge |

## Priority Queue

1. STALE/NO DATA hardening (Graceful Degradation)
2. Error boundary + crash screen (Stability)
3. MAX_OUTAGES calibration from real FirstEnergy data
4. Pi 5 hardware upgrade (~$80 purchase, not code)

## Current Build Status

| Area | State |
|------|-------|
| /dashboard (19 panels) | Working |
| /pi (kiosk glance, 1024x600) | Working |
| /pi3 (lightweight kiosk) | Working |
| /live (wall view) | Working |
| /settings, /operations, /snapshots | Working |
| /library | Partial (schema + page, no dual write sync) |
| Error boundary | Not built |
| STALE/NO DATA tile hardening | Not built |
| PROJECT_STATE.md | This file |
| PROJECT_DOCS.md | Current as of 2026-06-08 |
| Codebase cleanup | Complete: deprecated news-feed removed, unused assets deleted, stale memory files cleared |


## Key Decisions

1. Pi 3 is at hardware ceiling (thermal throttling 85C+, RAM exhaustion). No further software optimization. Target is Pi 5 8GB.
2. Kiosk anon key path is intentional (allows /pi without login).
3. ACLED credentials provisioned but not wired (OAuth2 password grant, not API key).
4. news-feed edge function deprecated, replaced by gdelt-headlines.
5. Display EDID fix: video=HDMI-A-1:1024x600M@60D in /boot/firmware/cmdline.txt.
6. Lovable rebuild tendency: always reuse existing components + override CSS. Never ask for a "new design."
7. Deprecated news-feed edge function fully removed (was replaced by gdelt-headlines April 2026). Edge function count is now 11.

## Known Footguns

1. Dead feed on power outage gauge silently renders as full healthy green bar.
2. MAX_OUTAGES placeholder (2500) not calibrated against real data.
3. No error boundary: one tile throwing kills the whole dashboard.
4. Lovable will rebuild visual designs from scratch if given design freedom.
5. ACLED uses OAuth2 password grant, not a traditional API key.
6. Wayland/KMS on Bookworm ignores legacy hdmi_* config.txt settings.

## Environment & Secrets

All in Supabase Secrets (server side):
NASA_API_KEY, AIRNOW_API_KEY, EIA_APP_KEY, FRED_API_KEY, CLOUDFLARE_RADAR_API_TOKEN, ACLED_EMAIL, ACLED_PASSWORD, NEWS_API (legacy), LOVABLE_API_KEY (managed)

Frontend .env (publishable only):
VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_URL
