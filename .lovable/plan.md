## Internet Health panel — status backgrounds + wording

### Wording
- Green → **OK**
- Yellow → **UNSTABLE**
- Red → **CRITICAL**

### Status thresholds (client-side, derived from existing payload)
```
level =
  red    if |trafficDeltaPct| > 30  OR attackLevel === 'high'
  yellow if |trafficDeltaPct| > 15  OR attackLevel === 'medium'
  green  otherwise
```

### Background images
Copy both uploads into `src/assets/` with clean names:
- `src/assets/vaultboy-yellow.jpg` (uploaded yellow shrug)
- `src/assets/vaultboy-red.jpg` (uploaded red thumbs-down)
- Green stays the current flat panel background (no image) — keeps the calm/normal state quiet.

### Implementation (only `src/components/panels/InternetHealthPanel.tsx`)
1. Import both images as ES6 modules.
2. Compute `level` from `data.trafficDeltaPct` + `data.attackLevel`.
3. Wrap the panel body in a relatively-positioned container with:
   - `backgroundImage` set to the matching asset (yellow/red), `background-size: cover`, `background-position: right center` so the vault boy sits on the right edge of the panel.
   - A dark scrim overlay (`bg-background/70` to `bg-background/80`) so existing text stays readable.
   - No background when level is green.
4. Replace the existing "attacks: low/medium/high" badge text with the status word **OK / UNSTABLE / CRITICAL**, colored via existing severity tokens (`severity-low`, `severity-moderate`, `severity-critical`).
5. Keep the big traffic-delta number, anomaly note, top targets list, and Cloudflare link exactly as they are — only the badge wording and panel background change.

### Out of scope
- No edge function changes (`attackLevel` thresholds in `cloudflare-radar/index.ts` stay as-is).
- No other panels touched.
- README untouched.

### Verification
- View `/live` and `/pi` in preview; confirm green state is clean, then temporarily force `level = 'yellow'` and `'red'` to eyeball the backgrounds before reverting.
