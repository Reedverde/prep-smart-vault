## Goal
Stop the big `SYSTEM :: CLOCK` digits from shifting horizontally every tick. Right now `22:20:45` is rendered in Orbitron, which is a proportional font — each digit has a different width, so the whole string nudges left/right as the seconds change.

## Approach
Render the time with **fixed-width digit slots** so every character occupies the same horizontal space.

Two viable options:

1. **Tabular figures (lightest touch)** — add `font-variant-numeric: tabular-nums; font-feature-settings: "tnum";` to `.pi-big-clock`. Works only if Orbitron's webfont actually ships tabular figures. If it doesn't, digits will still be proportional.

2. **Per-character fixed slot (guaranteed)** — change the clock render to wrap each character in a `<span>` with a fixed `inline-block` width (e.g. `0.62ch` for digits, `0.35ch` for the `:` separator). This is independent of the font and 100% prevents jitter while keeping the Orbitron look.

Recommended: do **both** — add `tabular-nums` for free, and also wrap the digits in fixed slots so it works regardless of font support.

## Changes

**`src/styles/pi.css`** — `.pi-big-clock`:
- add `font-variant-numeric: tabular-nums;`
- add `font-feature-settings: "tnum";`

**New CSS** — `.pi-big-clock .d` (digit slot) and `.pi-big-clock .s` (separator slot):
- `.d` → `display: inline-block; width: 0.62ch; text-align: center;`
- `.s` → `display: inline-block; width: 0.35ch; text-align: center;`

**`src/pages/Pi.tsx`** (line 607) — replace `{clockStr}` with a small inline render that splits `clockStr` into characters and wraps digits in `<span class="d">` and `:` in `<span class="s">`.

## Out of scope
- The smaller `pi-clocknow` line in the meta header (also Orbitron-ish but much smaller; can apply the same fix later if it's noticeable).
- No changes to time format, font family, color, or background.