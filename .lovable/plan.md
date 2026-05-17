## Conflict Pulse — replace "0 articles" with top 3 regions + themes

**File:** `src/components/panels/ConflictPulsePanel.tsx`

**Change:** In the area currently showing the large "0 ARTICLES" count beside the LOW/ELEVATED/HIGH label, render a compact two-column list:
- **TOP REGIONS** — top 3 entries from `byRegion` (sorted desc), formatted as `🇺🇸 United States · 142`
- **TOP THEMES** — top 3 entries from `byType` (sorted desc, excluding "Other"), formatted as `Protest · 87`

Keep the existing label pill (LOW/ELEVATED/HIGH) on the left. Replace the single "N ARTICLES" number on the right with the two stacked mini-lists. Use the same mono font / dim styling already in the file (`text-[10px]`, `text-dim`, uppercase headers).

Remove the now-redundant single-line `Top region` and `Top theme` rows below (since they're shown in the new block). Keep the `Conflict articles (7d)` row and the article list intact.

**Files touched:** `ConflictPulsePanel.tsx` only. No data/hook changes — `byRegion` and `byType` are already returned by `useGdelt`.