

# PrepPi — Stage 1: Foundation

This replaces the prior Prepper Library plan. PrepPi is a personal situational awareness dashboard that will be built in 4 sequential stages per the uploaded manifest. **This plan covers Stage 1 only** — auth, database schema, app shell, settings, and design system. Stages 2–4 (live dashboard panels, snapshots, alerts) will be built as separate prompts after Stage 1 is verified working.

---

## Design System — Dark Terminal Aesthetic

A dark, monospace-accented "ops console" look applied via the global design tokens:

- **Backgrounds**: deep near-black page (`#0a0e14`), slightly lighter panels (`#161b22`), darker insets (`#0d1117`)
- **Text**: primary `#c9d1d9`, dim `#8b949e`, muted `#6e7681`
- **Semantic accents**: green (`#7ee787`) for panel titles & positive, blue (`#58a6ff`) for links/info, yellow → orange → red for moderate → severe → critical
- **Type**: system sans for body, monospace (`SF Mono`) for logos, panel titles (uppercase, tracked), and timestamps
- **Panels**: 8px rounded, 1px border, header divider under uppercase green title, source attribution in top-right

---

## Authentication

Sign-in page with PrepPi logo (mono "PREP" blue + "PI" green) on the dark background:

- **Google OAuth** (primary, larger button) — requires Google Cloud OAuth setup; will provide step-by-step instructions for the user
- **Email + password** with Sign In / Sign Up toggle and Forgot Password link
- After login → redirect to `/dashboard`
- Sessions persisted via Supabase

---

## Database Schema (Supabase, all RLS-enabled)

Five tables created up front so later stages plug in without migrations:

- **`user_settings`** (1 row per user) — location name, lat/lng, timezone, optional API keys (AirNow, ACLED), ntfy topic, alert tier toggles (1/2/3), channel toggles (banner/web push/email/ntfy), refresh interval. Auto-created on signup via trigger. Defaults seeded for New Castle, PA.
- **`snapshots`** — id, user_id, captured_at, kind (manual/auto), title, notes, dashboard_data (jsonb), screenshot_url, summary (jsonb). Used in Stage 3.
- **`alerts`** — id, user_id, source, external_id (with unique constraint for dedup), tier (1/2/3), severity, event_type, headline, description, area_desc, issued_at, expires_at, dismissed_at, delivered_channels. Used in Stage 4.
- **`inventory_items`** — schema only, UI in a future stage.
- **`library_docs`** — schema only, UI in a future stage.

Every table: RLS policy `auth.uid() = user_id`. Indexes on common query paths.

---

## App Shell & Routing

**Top nav (fixed, 56px)**: PREPPI logo · Dashboard · Snapshots · Library · Operations · Settings · live indicator (pulsing green dot) · clock in user timezone · user avatar/menu. Active item gets blue tint. Mobile: hamburger menu under 768px.

**Routes**:
- `/` → redirect to `/dashboard` (auth) or `/login`
- `/login` — sign in / sign up
- `/dashboard` — placeholder grid of 8 panels (filled in Stage 2)
- `/snapshots` — empty state (built in Stage 3)
- `/library` — "Coming soon" placeholder
- `/operations` — "Coming soon" placeholder
- `/settings` — fully functional in Stage 1

---

## Settings Page (fully functional)

Four sections, each saving immediately on change with subtle "Saved" feedback:

1. **Location** — current location text + coordinates display, "Change" dialog for manual lat/lng entry (geocoding is a future enhancement), timezone dropdown.
2. **API Keys (optional)** — EPA AirNow and ACLED password inputs with "Get key →" links and **Save & test** buttons that call the API and show ✓ / ✗ feedback. Keys stored in `user_settings` (RLS-protected).
3. **Alerts & Notifications** — three tier toggle cards (red Tier 1, yellow Tier 2, blue Tier 3) with descriptions; four channel toggles (banner / web push / email / ntfy); ntfy topic input with helper text. Defaults: Tier 1+2 ON, Tier 3 OFF; banner+push+email ON, ntfy OFF. (Tier/channel logic wires up in Stage 4.)
4. **Account** — email, signed-in-with provider, member since, Sign Out, Change Password (email accounts only).

---

## Dashboard Shell (Stage 1)

Layout grid in place so Stage 2 just fills the panels:

- Location banner at top: "■ {location} · Data refreshes every {interval} min"
- 8 placeholder panels with proper frame, title, and source attribution slot, body says "Coming in Stage 2": **CURRENT WEATHER · ACTIVE ALERTS · EARTHQUAKES · SPACE WEATHER · AIR QUALITY · NATIONAL · US ALERTS · GLOBAL SITUATION · SYSTEM HEALTH**
- Responsive: 3-col desktop, 2-col tablet, 1-col mobile stack

---

## Reusable Components (built now, used by Stages 2–4)

`Panel`, `PanelHeader`, `ContextBox`, `SourceLink`, `Tooltip`, `StatBox`, `Gauge`, `Sparkline`, `SeverityBadge`, `LiveIndicator`, `TopNav`, `PageContainer`. Charts use Recharts (installed now).

---

## What the user will need to do

- **Approve enabling Lovable Cloud** (Supabase) on the project — required for auth, database, and later Edge Functions.
- **Set up Google OAuth credentials** in Google Cloud Console and paste the Client ID + Secret into Supabase Auth settings — I'll provide a clear step-by-step walkthrough after the build.
- (Optional, for later) sign up for free EPA AirNow and ACLED keys when ready to enable those panels in Stage 2.

---

## Stage 1 Acceptance Criteria

1. Visit app → see login page with Google + email/password options
2. Sign up with email or Google → land on `/dashboard` with placeholder panel grid
3. Open Settings → see email and default location (New Castle, PA)
4. Change location, toggle alert tiers/channels → all persist immediately
5. Enter a fake AirNow key → "Save & test" gives clear ✓/✗ feedback
6. Navigate Snapshots / Library / Operations → see appropriate placeholders
7. Sign out + back in → settings preserved
8. Mobile: navigation, settings, and dashboard shell all responsive

---

## After Stage 1

Once Stage 1 is verified working, send the Stage 2 PDF as a fresh prompt to add live NWS / USGS / SWPC / AirNow / ACLED data panels with charts, gauges, tooltips, and source attribution. Then Stage 3 (snapshots + hourly auto-capture + 30-day cleanup), then Stage 4 (tiered alert pipeline with banner, web push, email, ntfy.sh, and PWA install).

