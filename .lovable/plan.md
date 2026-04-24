# Plan — Use device location for weather & panels

## What you're asking

Right now your location is set manually in **Settings → Location** (name, latitude, longitude typed in by hand). All location-aware panels (Weather, Hazard Outlook, Air Quality, Earthquakes, Power Outages, etc.) read those coordinates from your saved settings.

You want a way to grab the device's *current* location and use it instead — so when you open the dashboard on a phone, laptop, or Pi with GPS, it can show local weather without you typing coordinates.

## How it'll work

The browser already has a built-in `navigator.geolocation` API. With your permission, it returns lat/lng (from GPS on phones, Wi-Fi triangulation on laptops, IP geolocation on the Pi). We'll wire that up to a new button in Settings.

### 1. "Use my current location" button — Settings page

In the Location dialog (and as a quick action on the Location card itself):

- New button: **📍 Use current location**
- Click it → browser asks for permission → on success, lat/lng auto-fills the form
- Reverse-geocode the coordinates to a human-readable name (e.g. "Austin, TX") using the free Nominatim/OpenStreetMap API so the location name updates too
- Try to detect timezone from coordinates using the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` and set it
- Save automatically; toast confirms "Location updated to Austin, TX"

If permission is denied or unavailable: clear error toast explaining how to re-enable in browser settings.

### 2. Optional: prompt on first sign-in

If a user has the default location (whatever the trigger seeds — likely a placeholder), show a one-time banner on the dashboard: *"Use your current location for accurate local data?"* with a single button. Dismissible; doesn't nag.

This is opt-in only — won't auto-prompt without a clear ask.

### 3. Pi-specific note

On the Raspberry Pi (no GPS, no Wi-Fi geolocation), browser geolocation falls back to IP-based lookup, which is usually accurate to the city. That's fine for weather/grid/outages but not for hyper-local stuff. The Pi will most often keep the manually-set location anyway — this feature mainly helps mobile/laptop users.

## What changes

**Files touched:**
- `src/pages/Settings.tsx` — add geolocation button + reverse-geocode helper inside the Location dialog
- `src/hooks/useGeolocation.ts` *(new)* — small hook wrapping `navigator.geolocation.getCurrentPosition` with loading/error states
- `src/lib/geocode.ts` *(new)* — tiny helper that calls Nominatim's reverse-geocode endpoint (no API key needed; we'll set a proper `User-Agent` and respect their usage policy with a 1-req-per-action pattern)

**No changes to:**
- Database schema (still using existing `latitude`, `longitude`, `location_name`, `timezone` columns in `user_settings`)
- Any panel components (they keep reading from `useUserSettings` exactly as today)
- Edge functions
- Auth

## What you'll see

1. Open **Settings → Location**
2. Click **Change** → see new **📍 Use current location** button at the top of the dialog
3. Browser asks permission once → lat/lng/name/timezone fill in automatically
4. Click **Save** → all weather, hazard, air quality, etc. panels now use your real location

## Out of scope

- Continuous GPS tracking (battery drain, no real benefit for this app)
- Multiple saved locations / location switcher (could be a future feature)
- Map picker UI (the lat/lng inputs stay as a fallback)
- Auto-updating location in the background
