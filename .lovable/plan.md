

# Update Logos: Favicon, Login Image, and Installable Manifest

Two uploaded mascots get wired in:
- `lcon.jpg` (light-green background, square) → favicon + PWA install icon
- `PrepPi_1-2.png` (transparent background) → Login page mascot, 404 page, replaces the current `src/assets/preppi-logo.png` used by `LogoMark`

## Asset placement

Copy uploads into the project:
- `user-uploads://lcon.jpg` → `public/favicon.png` (also used as PWA icon at 512×512)
- `user-uploads://lcon.jpg` → `public/icon-192.png` (same file, browsers will scale)
- `user-uploads://PrepPi_1-2.png` → `src/assets/preppi-mascot.png` (transparent, for in-app use)

Delete the old `public/favicon.ico` so browsers don't fall back to it.

Keep `src/assets/preppi-logo.png` in place but stop referencing it (LogoMark switches to the new transparent mascot).

## Code changes

**`index.html`**
- Add `<link rel="icon" href="/favicon.png" type="image/png">`
- Add `<link rel="apple-touch-icon" href="/favicon.png">`
- Add `<link rel="manifest" href="/manifest.webmanifest">`

**`public/manifest.webmanifest`** (new file — installable, no service worker)
```json
{
  "name": "PrepPi",
  "short_name": "PrepPi",
  "description": "Situational Awareness Console",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0e14",
  "theme_color": "#0a0e14",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/favicon.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

No `vite-plugin-pwa`, no service worker — per project guidance, this gives "Add to Home Screen" installability without breaking the Lovable preview.

**`src/components/LogoMark.tsx`**
- Swap import from `@/assets/preppi-logo.png` → `@/assets/preppi-mascot.png`
- Remove the `rounded-2xl` class (the new mascot is transparent; rounded corners on transparent PNG do nothing useful and may clip leaf tips)

This automatically updates everywhere `LogoMark` is rendered:
- `Login.tsx` (via `<Logo size="lg" />`)
- `NotFound.tsx` (via `<Logo size="lg" />`)

No changes needed to `Login.tsx` or `NotFound.tsx` themselves — they already render the mascot at `size="lg"`.

## Why no full PWA / service worker

Per project guidance, service workers break Lovable's iframe preview (stale caches, navigation interference). A plain `manifest.webmanifest` gives users the install prompt and home-screen icon without the downsides. Offline support isn't in scope here (Stage 5 territory if ever needed).

## Files touched

- `index.html` — icon links + manifest link
- `public/favicon.png` (new, from `lcon.jpg`)
- `public/icon-192.png` (new, from `lcon.jpg`)
- `public/manifest.webmanifest` (new)
- `public/favicon.ico` (deleted)
- `src/assets/preppi-mascot.png` (new, from `PrepPi_1-2.png`)
- `src/components/LogoMark.tsx` — swap image source, drop `rounded-2xl`

## Out of scope

- Service worker / offline caching
- Wordmark (`LogoWordmark`) changes — the magenta-Pi text logo in the top-nav stays as-is
- Settings/Snapshots/Library page logo changes (they use the wordmark, not the mascot)

