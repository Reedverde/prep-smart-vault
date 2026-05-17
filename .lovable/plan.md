**Problem:** `.pi-ticker-scroll` uses a fixed CSS animation duration (35s). The keyframe translates a fixed percentage, so longer content covers more pixels in the same time → scrolls visibly faster as headlines pile up.

**Fix:** Make the duration scale linearly with content length, applied inline from `Pi.tsx`. This gives a constant ~characters-per-second rate regardless of how many headlines are loaded.

### Edit 1 — `src/pages/Pi.tsx` (~line 760)

```tsx
<div
  className="pi-ticker-scroll"
  style={{ animationDuration: `${Math.max(20, ticker.length / 6)}s` }}
>
  <span style={{ paddingRight: 40 }}>:: {ticker}  ::  </span>
  <span style={{ paddingRight: 40 }}>:: {ticker}  ::  </span>
</div>
```

- `ticker.length / 6` → roughly 6 chars/sec (single tunable knob).
- `Math.max(20, …)` prevents an absurdly fast loop when the feed is short/empty.

### Edit 2 — `src/styles/pi.css` line 447

Change the hardcoded `35s` default to something neutral like `60s` (overridden by the inline style anyway, but kept as a safe fallback).

### Why it works

Keyframe is `translateX(0) → translateX(-50%)`; the duplicated `<span>` makes the loop seamless. Distance per loop ≈ one copy's rendered width ≈ proportional to character count. Scaling duration with `ticker.length` keeps px/sec roughly constant.

### Tuning knob

After shipping, the only number to change is the divisor (`/ 6`). Higher = slower; lower = faster.