**Source:** Headlines come from `useGdeltHeadlines(STD)` — same feed powering the HEADLINES · 6H tile. Auto-refresh cadence is unchanged.

**Change:** In `src/pages/Pi.tsx`, replace the single-headline `ticker` memo (lines 430–435) so it joins the top 10 titles with a `::` separator:

```ts
const ticker = useMemo(() => {
  const items = headlinesData?.items ?? [];
  const titles = items
    .slice(0, 10)
    .map((it: any) => (it?.title || it?.headline || it?.name || "").trim())
    .filter(Boolean);
  return titles.length ? titles.join("  ::  ") : "AWAITING HEADLINE FEED";
}, [headlinesData]);
```

The existing duplicated `<span>:: {ticker} ::</span>` marquee pair (lines 760–763) stays as-is and seamlessly loops the longer string.

**Notes:**
- No hook, CSS, or backend changes.
- With ~10 headlines the strip is much longer, so each headline visibly moves through faster at the current 35s loop. We can re-tune scroll speed after seeing it live if needed.