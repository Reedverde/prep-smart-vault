# Project Memory

## Core
PrepPi: Situational awareness dashboard & offline-resilient document archive.
Tech Stack: Lovable, Supabase, React. Designed for zero-rebuild migration to self-hosted Raspberry Pi.
Storage: Dual-write to Google Drive and local Pi. Pi hosts DB/search at http://10.10.10.10 for offline use.
Aesthetic: Dark Terminal/Ops Console. Deep black (#0a0e14), panels (#161b22). SF Mono for headers/logos.
Security: Third-party API keys as Cloud Secrets, proxied via Supabase Edge Functions. No browser exposure.
Visuals: Recharts for panels. LogoMark (mascot) for Login/404, LogoWordmark (SVG) for nav.

## Memories
- [Project Overview](mem://project/overview) — PrepPi concept and high-level goals
- [Aesthetic & Theme](mem://style/aesthetic) — 'Dark Terminal' aesthetic, color palette, and typography
- [Branding Assets](mem://style/branding) — Rules for logo usage and branding variants
- [Dual-Write Sync](mem://architecture/dual-write-sync) — Dual-write storage architecture for Google Drive and local Pi
- [Deployment Strategy](mem://architecture/deployment-strategy) — Supabase V1 to self-hosted Raspberry Pi migration path
- [API Security](mem://architecture/api-security-model) — Management and proxying of third-party API keys via Edge Functions
- [Dashboard Panels](mem://features/dashboard-panels) — 12-panel priority-ordered 4-row grid layout with alert history and sun+gauge side-by-side
- [Stage 5 Drive Plan](mem://features/stage-5-drive-plan) — Stage 5 Google Drive integration plan
- [Future Enhancements](mem://future-enhancements) — Deferred Commit 4 specs (BA map, Kp trend)
