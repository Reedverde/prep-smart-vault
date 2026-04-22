

# Plan — Tone down `/pi` background tints to match mockup

## What's wrong

Comparing live `/pi` to the mockup screenshot:

1. **Watch tiles are too green/amber** — currently row 2 (Fuel/STLFSI/Nat'l/PJM) shows a heavy uniform amber wash across the whole tile. In the mockup the tile body is near-black; only a *very faint* gradient bleeds in from the colored left border.
2. **Alert tiles pulse too red** — Conflict Pulse and Disasters in the mockup show a barely-perceptible red haze localized near the left edge, not a strong full-tile red fill.
3. The **3px colored left border** + the **colored value text** are doing all the severity work. The tile background should stay essentially `#050705` (near-black) across all severity levels.

## Fix (single file: `src/components/PiTile.tsx`)

### 1. Replace flat `backgroundColor` tints with a localized left-edge gradient

Instead of `backgroundColor: rgba(244,181,92,0.04)` (amber wash) on watch and `rgba(255,107,94,0.06)` on alert — both of which paint the whole tile — use a horizontal gradient that fades from a slightly-tinted left edge to pure `#050705` within the first ~40% of the tile width.

Replace `sevBgTint(sev)` with `sevBgGradient(sev)`:

```ts
const sevBgGradient = (sev: PiSeverity): string => {
  switch (sev) {
    case "alert":
      return "linear-gradient(90deg, rgba(255,107,94,0.10) 0%, rgba(255,107,94,0) 35%)";
    case "watch":
      return "linear-gradient(90deg, rgba(244,181,92,0.06) 0%, rgba(244,181,92,0) 30%)";
    case "clear":
      return "linear-gradient(90deg, rgba(125,227,138,0.04) 0%, rgba(125,227,138,0) 25%)";
    default:
      return "none";
  }
};
```

Apply in the tile root style:
```ts
style={{
  background: "#050705",
  backgroundImage: sevBgGradient(sev),
  borderLeft: `3px solid ${color}`,
  // ...
}}
```

### 2. Tone down the alert pulse keyframe

Currently `pi-alert-pulse` swings the whole tile background between `rgba(255,107,94,0.04)` and `rgba(255,107,94,0.14)`. That fights with the new gradient. Change it to pulse only the gradient strength via opacity on a pseudo-overlay, OR — simpler — drop the pulse off the whole tile and instead pulse only the left border color brightness:

```css
@keyframes pi-alert-pulse {
  0%, 100% { border-left-color: #ff6b5e }
  50%      { border-left-color: #ff8d83 }
}
```

Update in `Pi.tsx`'s inline `<style>` block (this is the only edit to `Pi.tsx`).

The animation now reads as a quiet "throb" on the severity bar itself instead of a full-tile red wash.

### 3. Keep everything else identical

- 3px colored left border per severity → unchanged
- Value color → unchanged (green/amber/red/faint)
- Sparkline color/opacity → unchanged
- Tile number, label, sub styling → unchanged
- Layout, grid, frame, scanlines, ticker → unchanged

## Files touched

- `src/components/PiTile.tsx` — replace `sevBgTint` with `sevBgGradient`, swap `backgroundColor` for `backgroundImage` in the root style.
- `src/pages/Pi.tsx` — update the `pi-alert-pulse` keyframes inside the inline `<style>` block (lines 505–508) to animate `border-left-color` instead of `background-color`.

## Acceptance check after deploy

1. Quote the new `sevBgGradient` function and the updated tile root `style` block from `PiTile.tsx`
2. Quote the updated `@keyframes pi-alert-pulse` from `Pi.tsx`
3. Confirm visually (screenshot via the user) that:
   - Watch tiles (amber) show only a faint left-edge glow, body stays near-black
   - Alert tiles (red) pulse on the left bar, not the full tile background
   - Clear tiles (green) and info tiles look unchanged
4. No layout shift, no console errors

## Out of scope

Tile order, severity rules, hook wiring, fonts, scanlines, ticker, frame brackets — all unchanged.

