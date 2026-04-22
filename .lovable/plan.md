

# Plan — Global Headlines: situational-awareness filter

Single commit. One edge function + one panel tweak. Layered on top of the approved 4-panel pass.

## 1. Broader positive query

Replace the GDELT query string in `supabase/functions/gdelt-headlines/index.ts` with the geopolitical/political/economic-shock terms from the spec:

```
(protest OR conflict OR war OR military OR invasion OR coup OR sanctions OR ceasefire OR
 diplomatic OR parliament OR congress OR election OR legislation OR policy OR treaty OR
 summit OR cyberattack OR ransomware OR breach OR terrorism OR terror OR bombing OR
 missile OR airstrike OR "drone strike" OR shelling OR blockade OR embargo OR recession OR
 inflation OR "currency crisis" OR "bank run" OR "sovereign default" OR "trade war" OR
 tariff OR OPEC OR "oil prices") sourcelang:english
```

Bump `maxrecords` from 75 → 100 so post-filtering still has enough to reach the 25-row display target.

## 2. Server-side exclusion filter

Before classification, run each article title through grouped regexes. First match wins; article dropped, reason tallied:

```ts
const EXCLUDE: Array<{ reason: string; rx: RegExp }> = [
  { reason: 'entertainment', rx: /\b(actor|actress|singer|rapper|musician|celebrity|influencer|reality tv|kardashian|taylor swift|beyonce|oscars?|grammys?|golden globes?|emmy|mtv|billboard|netflix series|hbo series|marvel|dc comics)\b/i },
  { reason: 'entertainment', rx: /\b(movie|film premiere|box office|tv show|reality show|streaming release|album release|tour announcement|red carpet)\b/i },
  { reason: 'sports',        rx: /\b(nba|nfl|nhl|mlb|fifa|world cup|super bowl|olympics|athlete|quarterback|touchdown|playoff|championship game|coach fired|trade deadline)\b/i },
  { reason: 'personal',      rx: /\b(wife|husband|boyfriend|girlfriend|ex-|love triangle|domestic dispute|neighborhood dispute|local man|local woman)\b/i },
  { reason: 'personal',      rx: /\b(breast|sexual assault on|alleged affair|divorce filing|custody battle)\b/i },
  { reason: 'lifestyle',     rx: /\b(recipe|diet|fashion|makeup|skincare|horoscope|zodiac|celebrity home|mansion tour|tiktok trend|viral video|dating app)\b/i },
];
```

Tally a `reasons` map. Continue counting beyond the cap so the log reflects true input distribution.

## 3. Domain denylist

Drop by domain (full match) or URL substring (sub-paths):

```ts
const DENY_DOMAINS = new Set([
  'tmz.com','people.com','usmagazine.com','eonline.com','etonline.com',
  'buzzfeed.com','ranker.com','naturalnews.com',
]);
const DENY_URL_SUBSTR = ['dailymail.co.uk/tvshowbiz/','dailymail.co.uk/femail/'];
```

Domain check uses already-parsed `domain`. URL substring check uses lowercased `articleUrl`. Counted under `reasons.domain`.

## 4. Classifier — add POLITICAL

Extend the `Tag` union and add this line in `classify()`, positioned AFTER VIOLENCE and BEFORE PROTEST (matches spec ordering):

```ts
if (/(election|parliament|congress|legislation|diplomatic|summit|treaty|sanctions|ceasefire|tariff|embargo|\bpolicy\b)/.test(t)) return 'POLITICAL';
```

`\bpolicy\b` to avoid matching "policymaker" inside cyber stories etc.

## 5. Logging

Replace the existing distribution log with the richer one:

```ts
console.log('gdelt-headlines:', {
  fetched: articles.length,
  excluded: excludedCount,
  remaining: items.length,
  reasons,        // { entertainment: 5, sports: 3, personal: 4, lifestyle: 1, domain: 2 }
  tagCounts,      // post-classification
  otherPct,
});
```

## 6. Panel — POLITICAL tag style

In `src/components/panels/GlobalHeadlinesPanel.tsx`:

- Extend the `Tag` union with `"POLITICAL"`
- Add to `tagStyle` map using the same moderate/dim treatment as ECONOMIC:
  ```ts
  POLITICAL: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  ```

No layout, no copy, no header changes.

## Files touched

- `supabase/functions/gdelt-headlines/index.ts` — query, exclusion filter, denylist, POLITICAL tag, richer log
- `src/components/panels/GlobalHeadlinesPanel.tsx` — POLITICAL tag style + type

Edge function deploys automatically. After deploy I'll surface the new distribution log so we can tune.

## Acceptance

- [ ] Entertainment, celebrity, personal-crime, sports, lifestyle stories filtered out before classification
- [ ] Domain denylist drops TMZ/People/Buzzfeed/NaturalNews/etc.
- [ ] POLITICAL tag appears in feed, styled like ECONOMIC
- [ ] Edge function log reports `{ fetched, excluded, remaining, reasons, tagCounts, otherPct }`
- [ ] OTHER tag share trends below 30% on next fetch
- [ ] No console errors, no panel layout changes

## Out of scope

Panel rename · other panels · layout · the in-flight 4-panel commit (this stacks cleanly on it)

