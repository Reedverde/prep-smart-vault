## Changes

### 1. Brighten "info" tiles
In `src/components/PiTile.tsx`, the `info` severity currently maps to `--pi-text-faint` (`#3d4a3d`), making neutral readings (Weather 54°F, 0 active alerts, etc.) look dim. Change `sevColorVar` so `info` returns `--pi-green` (`#7de38a`) — same brightness as `clear`. Severity tiers will still be distinguishable: `alert` red, `watch` amber, `clear`/`info` bright green.

Optionally keep info slightly distinct via opacity (e.g. 0.85) instead of a faint color, but easier read is the priority — recommend full brightness.

### 2. Taller bottom ticker for 7" screen
In `src/pages/Pi.tsx` (~line 635), the ticker bar is `height: 28` with `fontSize: 10`. Bump to:
- `height: 44`
- `fontSize: 14`
- `letterSpacing: 0.15em` (slightly tighter so it still flows)

Also increase the REC dot and UPLINK bars proportionally (gap, padding) so they stay visually balanced.

No other tiles or layout affected.