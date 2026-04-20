

# Commit 1.5 — Global Headlines English filter + scrollable

Small fix landing before Commit 2. Two changes + one diagnostic.

## Fix 1 — English-only filter

**Edge function** (`supabase/functions/gdelt-headlines/index.ts`):

Update GDELT query to append `sourcelang:english`:

```
(protest OR conflict OR violence OR unrest OR cyberattack OR coup OR invasion OR strike OR blockade) sourcelang:english
```

GDELT filters server-side, dropping non-English articles before they hit our classifier.

**Belt-and-suspenders client-side guard** in `GlobalHeadlinesPanel.tsx`: filter out any item whose title has >30% non-ASCII characters (catches transliterated headlines that slip through GDELT's lang detection).

```tsx
const isLikelyEnglish = (title: string): boolean => {
  if (!title) return false;
  const nonAscii = title.replace(/[\x00-\x7F]/g, "").length;
  return nonAscii / title.length <= 0.3;
};
const visible = items.filter((h) => isLikelyEnglish(h.title));
```

## Fix 2 — Scrollable panel with more headlines

**Edge function:** return top **25** (was 10).

**Panel:** wrap the headline list in a scrollable container, max-height ~500px. Only this panel gets the max-height; all other panels remain natural-height.

```tsx
<div className="max-h-[500px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent space-y-2">
  {visible.map(...)}
</div>
```

Add `tailwind-scrollbar` plugin to `tailwind.config.ts` (or fall back to a custom `::-webkit-scrollbar` block in `index.css` if we'd rather not add the plugin — leaning toward the CSS option to avoid a new dep). Plan: **CSS-only**, add to `src/index.css`:

```css
.scroll-thin::-webkit-scrollbar { width: 6px; }
.scroll-thin::-webkit-scrollbar-track { background: transparent; }
.scroll-thin::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
.scroll-thin::-webkit-scrollbar-thumb:hover { background: hsl(var(--dim)); }
.scroll-thin { scrollbar-width: thin; scrollbar-color: hsl(var(--border)) transparent; }
```

Use `className="... scroll-thin"` on the scroll container.

The `ContextBox` and `UpdatedAgo` stay **outside** the scroll container so they're always visible.

## Diagnostic — log tag distribution

In `gdelt-headlines/index.ts`, after classification, log a count by tag:

```ts
const tagCounts = items.reduce((acc, item) => {
  acc[item.tag] = (acc[item.tag] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
console.log("gdelt-headlines tag distribution:", tagCounts, "total:", items.length);
```

Visible in edge function logs. After the fix lands, check whether OTHER is still >50% — if so, we'll expand the keyword list next round.

## Files touched

- `supabase/functions/gdelt-headlines/index.ts` — query + maxrecords + tag-count log
- `src/components/panels/GlobalHeadlinesPanel.tsx` — `isLikelyEnglish` filter + scrollable wrapper
- `src/index.css` — `.scroll-thin` scrollbar styles

## Acceptance

- All visible headlines are in English
- Up to 25 items render, scrollable inside the panel
- Scrollbar is thin, dim, matches dark theme
- Other panels are unaffected (still natural height)
- Edge function logs show a tag distribution

## Out of scope

- Keyword list expansion (decided after seeing the distribution)
- Commits 2, 3, 4 (sequenced after this)

