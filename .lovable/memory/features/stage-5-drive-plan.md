---
name: Stage 5 Drive Integration (PARKED)
description: Full Google Drive integration plan, parked until Stages 3 & 4 ship
type: reference
---

**STATUS: PARKED — do not implement until user re-initiates Stage 5.**

Current priority order:
1. Finish GDELT swap (in flight)
2. Verify all 11 panels healthy after EIA key update
3. Stage 3 — Snapshots
4. Stage 4 — Alerts & Notifications
5. Stage 5 — Drive integration (this plan)

When the user re-initiates Stage 5, they will re-upload `05_STAGE_5_DRIVE.pdf`. Work from this plan as the starting point.

---

# Stage 5 — Google Drive Integration

Stage 5 turns the placeholder Library and Operations tabs into real, Drive-backed pages. Read-only by design: PrepPi never writes to Drive — it caches metadata and links out to Drive for editing.

## Prerequisites (user, before approval is useful)

In Google Cloud Console (same project as login):
1. Enable **Google Drive API** (and **Google Sheets API** for the inventory parser)
2. Add scope `.../auth/drive.readonly` to the OAuth consent screen
3. Confirm the existing OAuth Client ID's "Authorized redirect URIs" includes `https://preppi.everde.co/settings/drive-callback` (and the preview/published URLs actively used)
4. Provide `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Cloud Secrets

In their Drive: create a folder named exactly `PrepPi` at root, with an `INVENTORY` Google Sheet inside (any subfolder layout fine; `11_Operations` subfolder recommended for inventory→folder linking).

## Architecture

```text
┌──────────────┐   OAuth     ┌─────────────────┐
│  Settings UI │────────────▶│ drive-callback  │  Edge fn: code→tokens, locate PrepPi folder
└──────────────┘             └────────┬────────┘
                                      ▼
                             ┌─────────────────┐
                             │ drive_connections│  (tokens, RLS-locked)
                             └────────┬────────┘
                                      ▼
   pg_cron (15min) ──▶ ┌─────────────┐    ┌──────────────────┐
   Manual "Sync now" ─▶│  sync-drive │───▶│   library_docs   │  (file/folder cache)
                       │             │───▶│ inventory_items  │  (parsed INVENTORY sheet)
                       └─────────────┘    └──────────────────┘
                                      ▼
       Library / Operations / Recent Files panel  (read from Supabase, never Drive)
```

All Drive API calls happen in Edge Functions using the user's stored access token (refreshed server-side). The browser never sees Drive tokens.

## Database changes

**New table `drive_connections`** — per spec (tokens, root_folder_id, sync_status). RLS: user manages own row only.

**Extend `library_docs`** — add columns: `name`, `mime_type` (already exists), `parent_folder_id`, `folder_path`, `web_view_link`, `icon_link`, `size_bytes`, `modified_at`, `is_folder` (bool), `synced_at`. Keep existing columns (title, tags, etc.) for forward compat. Unique index on `(user_id, drive_file_id)`. Index on `(user_id, folder_path)`.

**Extend `inventory_items`** — add: `external_key` (for upsert dedup, e.g. `category|item|serial`), `make`, `model`, `caliber`, `serial`, `purchased_at`, `extra` jsonb, `synced_at`. Unique index `(user_id, external_key)`.

**pg_cron** — schedule `sync-drive-every-15min` calling a SECURITY DEFINER function that loops connected users and POSTs to `sync-drive`.

## Edge Functions (new)

1. **`drive-oauth-start`** — issues signed CSRF state token, returns the Google OAuth URL for the client to redirect to. Avoids client-side secret juggling.
2. **`drive-oauth-callback`** — verifies state, exchanges code for tokens, fetches Google email, locates `PrepPi` folder, upserts `drive_connections`, fires off initial `sync-drive`, returns success to the callback page.
3. **`sync-drive`** — refreshes token if expired, walks PrepPi folder via Drive API v3 (BFS, pageSize 1000), upserts `library_docs`, then calls inline inventory parsing (Sheets API on the INVENTORY file). Updates `last_synced_at` / `sync_status` / `sync_error` on the connection row. Idempotent.
4. **`drive-disconnect`** — revokes Google token, deletes `drive_connections` row, optionally clears cached `library_docs` for that user (keep cache so reconnect is instant; mark stale via flag).

Inventory parsing logic (inside `sync-drive`): forgiving header normalization (lowercase, trim), accept any subset of expected columns, store unknowns in `extra` jsonb, skip rows missing both `item` and `category`, build `external_key = ${category}|${item}|${serial||''}`.

## Frontend changes

### Settings page — new "Google Drive" section
Between Location and Alerts. States:
- **Disconnected**: blue "Connect Google Drive" button (calls `drive-oauth-start`, redirects)
- **Connected**: green check, `Connected as {email}`, `Last synced {time_ago}`, "Sync now" button (calls `sync-drive`), "Disconnect" link
- **Error**: red banner with `sync_error` + Retry button

### New route `/settings/drive-callback`
Tiny page that posts `code` + `state` from URL to `drive-oauth-callback`, shows spinner, then redirects to `/settings` with toast.

### Library page (`/library`) — full rebuild
- Header + description
- **Disconnected state**: CTA card → /settings
- **Connected state**: breadcrumb bar (path tracked in `?path=` URL param), search input, content grid
- Grid: folder cards first (alpha) then file cards (modified desc). Folder cards show child count. File cards show mime icon + name + size/modified, click opens `web_view_link` in new tab.
- Search: client-side over all cached `library_docs`, case-insensitive name match, results show folder_path
- Footer: "Last synced {time_ago}"

### Operations page (`/operations`) — full rebuild
- Header + description
- **No inventory**: CTA "Add an INVENTORY sheet to your PrepPi folder and sync"
- Filter tabs (All / Firearms / Vehicles / Tools / Electronics / Outdoor / Medical) with counts
- Search input (name / make / model / serial)
- Card grid: category icon, item name, "{make} {model} · {caliber}", mono serial, location badge, purchase date, notes, "Open folder in Drive →" link (only if a fuzzy match exists in `library_docs` under `11_Operations/`)

### Dashboard — new "Recent Drive Files" panel
- Added as final panel in grid (after System Health)
- **Disconnected**: compact "Connect Drive →" promo card so grid doesn't gap
- **Connected**: 10 most recently modified files, mime icon + name + "modified {time_ago}", click opens in Drive
- Source attribution links to PrepPi folder's `webViewLink`

### State code helper note
Mobile order updates to insert "Recent Drive Files" at the end. Layout memory will be revised.

## Security notes

- Tokens never sent to browser. All Drive calls use the access token server-side in Edge Functions.
- `drive_connections` RLS allows user to SELECT their row (so UI can read `last_synced_at`, `sync_status`, `google_account_email`) but the token columns are filtered out via a view (`drive_connections_public`) that excludes `access_token`/`refresh_token`. Frontend only ever reads the view.
- pg_cron invokes `sync-drive` via service role auth header — secret stored in vault, not hardcoded.

## Files touched

**New:**
- `supabase/functions/drive-oauth-start/index.ts`
- `supabase/functions/drive-oauth-callback/index.ts`
- `supabase/functions/sync-drive/index.ts`
- `supabase/functions/drive-disconnect/index.ts`
- `src/pages/DriveCallback.tsx` (route `/settings/drive-callback`)
- `src/hooks/useDriveConnection.ts`
- `src/hooks/useLibraryDocs.ts`
- `src/hooks/useInventory.ts`
- `src/components/panels/RecentDriveFilesPanel.tsx`
- Migration: `drive_connections` table, `library_docs` / `inventory_items` extensions, `drive_connections_public` view, pg_cron schedule

**Modified:**
- `src/pages/Settings.tsx` — Drive section
- `src/pages/Library.tsx` — full rebuild
- `src/pages/Operations.tsx` — full rebuild
- `src/pages/Dashboard.tsx` — add Recent Drive Files panel slot
- `src/App.tsx` — add `/settings/drive-callback` route
- `src/components/panels/SystemHealthPanel.tsx` — add `sync-drive` row
- `.lovable/memory/features/dashboard-panels.md` — bump panel count to 12, add Recent Drive Files row
- New memory: `.lovable/memory/features/drive-integration.md`

## Secrets needed

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OAUTH_STATE_SECRET` (for HMAC-signing the CSRF state token)

## Out of scope (explicit)

- Writing to Drive (read-only, by design)
- Embedded Drive viewer (always click-through to Drive)
- Full-text search inside documents (file-name search only for v1)
- Stage 3 (Snapshots) and Stage 4 (alert delivery) work
- Multiple Drive accounts per user (one connection per user)
- Folder content downloads / offline mirror (Pi-stage concern)

## Suggested split

This stage is large enough to ship in two commits:
1. **5a — Connection + Library** (auth flow, sync-drive, drive_connections, Library page, Settings section)
2. **5b — Operations + Dashboard panel** (inventory parsing, Operations page, Recent Drive Files panel)
