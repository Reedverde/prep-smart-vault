

# Swap ACLED → GDELT (Final)

Approved with two refinements:
- Threshold constants get a `// PROVISIONAL` comment — revisit after observing real baseline
- Drop the `notConfigured` guard entirely — GDELT is keyless, dead code

## Edge function: `gdelt-events` (new, keyless)

`supabase/functions/gdelt-events/index.ts`:
1. Fetch `https://api.gdeltproject.org/api/v2/doc/doc?query=(conflict OR protest OR violence OR unrest)&mode=artlist&maxrecords=250&timespan=7d&format=json`
2. Parse `articles[]`, aggregate:
   - `byRegion`: count by `sourcecountry`
   - `byType`: keyword scan over `title` for "protest" / "conflict" / "violence" / "unrest" → bucket; else "Other"
3. Return `{ count, byRegion, byType, from, to }` (same shape `GlobalPanel` already consumes)
4. Standard CORS, 502 on upstream failure, 500 on internal error. No 503/notConfigured path.

## Delete `acled-events`

Remove `supabase/functions/acled-events/index.ts`. ACLED secrets stay in the secret store (harmless).

## Frontend

**`src/hooks/useDataSources.ts`** — replace `useAcled` with `useGdelt`:
- Endpoint: `gdelt-events`
- Query key: `["gdelt"]`
- Drop the `503 → notConfigured` branch
- Return type: same shape

**`src/components/panels/GlobalPanel.tsx`**:
- Import `useGdelt` instead of `useAcled`
- Remove `gdeltNotConfigured` / "Contact admin" / "Not configured" branches — collapse to simple `hasGdelt = !!gdeltData` (true once loaded)
- `source="GDELT · GDACS"`, `sourceUrl="https://www.gdeltproject.org/"`
- `ContextBox` copy: "GDELT tracks global news coverage of conflict, protest, and violence. GDACS tracks active major natural disasters. 7-day totals."
- Rescale `conflictLabel` thresholds with provisional comment:
  ```ts
  // PROVISIONAL thresholds — guessed from initial GDELT volume.
  // Revisit after observing real baseline for ~1 week.
  if (n > 200) return "HIGH";
  if (n > 100) return "ELEVATED";
  ```
- Same provisional thresholds applied inline in the JSX `tone=` ternary

**`src/components/panels/SystemHealthPanel.tsx`**:
- Replace `{ key: "acled", label: "ACLED" }` row with `{ key: "gdelt", label: "GDELT" }`

## Memory update

Rewrite `mem://features/dashboard-panels` Global row:
- `Global | GlobalPanel | GDACS direct + GDELT 7d conflict/protest aggregation | GDACS direct; gdelt-events keyless proxy`
- Remove ACLED from graceful-degradation list (GDELT has no key path)

## Files touched

- `supabase/functions/gdelt-events/index.ts` (new)
- `supabase/functions/acled-events/index.ts` (deleted)
- `src/hooks/useDataSources.ts` — swap hook
- `src/components/panels/GlobalPanel.tsx` — swap hook, drop notConfigured branches, provisional thresholds + comment
- `src/components/panels/SystemHealthPanel.tsx` — swap source row
- `.lovable/memory/features/dashboard-panels.md` — GDELT instead of ACLED

## Out of scope

- Tuning thresholds (you'll revisit post-launch)
- Removing ACLED secrets (manual, optional)
- EIA (key already swapped)
- Stage 3 / Stage 4

