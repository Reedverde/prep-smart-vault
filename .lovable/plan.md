

# PrepPi Logo Integration

Replace the text-only "PREPPI" logo with the actual brand artwork in two variants, applied consistently across the app.

## Two logo variants

**1. `LogoMark` — full mascot logo (raspberry + ammo case)**
- Source: `user-uploads://PrepPi.png`
- Saved to `src/assets/preppi-logo.png` and imported as an ES6 module
- Used on the **Login page** and **404 page** at large size
- Renders on the existing dark background — the cream `#eaf0e0`-ish padding around the mascot is removed/transparent via CSS `mix-blend` or simply displayed as-is on the card area (will assess on first render and adjust)

**2. `LogoWordmark` — "PrepPi" text + two leaves on top**
- Pure SVG component (no raster), so it scales crisply and recolors with theme tokens
- Two simple leaf shapes sit centered above the wordmark, matching the cream/off-white tone seen in screenshot 3
- "PrepPi" rendered in a friendly rounded sans (Quicksand or Nunito via Google Fonts) — bold weight, mixed case (`P` capital, `r-e-p` lowercase, `P` capital, `i` lowercase) exactly like the reference
- Color: cream (`hsl(var(--accent-foreground))` style token) so it reads on the dark terminal background
- Used in the **TopNav** (small size) replacing the current `<PREP><PI>` mono text

## Component API

```text
<LogoMark size="sm|md|lg" />          // raster mascot
<LogoWordmark className="..." />       // SVG wordmark + leaves
```

The existing `Logo` component is updated to delegate:
- `size="lg"` → renders `LogoMark` (used on Login + 404)
- `size="sm" | "md"` → renders `LogoWordmark` (used in TopNav)

This keeps every existing `<Logo />` usage working without touching call sites.

## Files changed

- **Add** `src/assets/preppi-logo.png` (copied from upload)
- **Add** `src/components/LogoMark.tsx` — image-based mascot logo
- **Add** `src/components/LogoWordmark.tsx` — SVG wordmark with two leaves on top
- **Update** `src/components/Logo.tsx` — thin wrapper that picks the right variant by size
- **Update** `index.html` — add Google Font link for Quicksand (rounded, friendly)
- **Update** `tailwind.config.ts` — add `font-brand` family pointing to the new font

## Visual notes

- Wordmark leaves: two small mirrored leaf shapes (~10×14 px each) with a tiny stem gap between them, centered above the "P" of "Prep" and the "P" of "Pi" gap
- Wordmark color tokens stay theme-driven so a future light mode would still work
- Mascot logo has its own off-white background in the source image; on the dark Login page we'll either crop tightly or set it inside a soft rounded container so it reads as intentional rather than a stray rectangle

## Out of scope

- No favicon/PWA icon update yet (can follow once you confirm the look)
- No changes to dashboard panels or data flows

