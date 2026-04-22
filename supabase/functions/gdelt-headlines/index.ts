const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache to respect GDELT's 1-request-per-5-seconds rate limit.
// 5-min cache balances freshness against the upstream limit.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; payload: unknown } | null = null;

type Tag =
  | 'CYBER'
  | 'COUP'
  | 'INVASION'
  | 'CONFLICT'
  | 'VIOLENCE'
  | 'POLITICAL'
  | 'PROTEST'
  | 'UNREST'
  | 'DISASTER'
  | 'ECONOMIC'
  | 'OTHER';

const classify = (title: string): Tag => {
  const t = title.toLowerCase();
  // Most specific / highest-stakes first.
  if (/(cyber|hack|ransomware|breach|malware|phishing|data leak|exploit|zero[- ]day|ddos)/.test(t)) return 'CYBER';
  if (/coup/.test(t)) return 'COUP';
  if (/(invasion|invade)/.test(t)) return 'INVASION';
  if (/(conflict|war|military|airstrike|shelling|offensive|missile|drone strike|skirmish|clash)/.test(t)) return 'CONFLICT';
  if (/(violence|attack|killed|shooting|bombing|stabbing|assault|murder|massacre|ambush|terror|terrorism)/.test(t)) return 'VIOLENCE';
  // POLITICAL after VIOLENCE so "political violence" still tags as VIOLENCE.
  if (/(election|parliament|congress|legislation|diplomatic|summit|treaty|sanctions|ceasefire|tariff|embargo|\bpolicy\b)/.test(t)) return 'POLITICAL';
  if (/(protest|demonstration|rally|march|riot|blockade)/.test(t)) return 'PROTEST';
  if (/(unrest|uprising)/.test(t)) return 'UNREST';
  if (/(earthquake|hurricane|wildfire|flood|tsunami|volcano|cyclone|typhoon|tornado)/.test(t)) return 'DISASTER';
  if (/(recession|inflation|layoffs|stock crash|bank run|default|bankruptcy|currency crisis|trade war|opec|oil prices)/.test(t)) return 'ECONOMIC';
  return 'OTHER';
};

// Server-side noise filter — drop personal/entertainment/sports/lifestyle before classification.
const EXCLUDE: Array<{ reason: string; rx: RegExp }> = [
  { reason: 'entertainment', rx: /\b(actor|actress|singer|rapper|musician|celebrity|influencer|reality tv|kardashian|taylor swift|beyonce|oscars?|grammys?|golden globes?|emmy|mtv|billboard|netflix series|hbo series|marvel|dc comics)\b/i },
  { reason: 'entertainment', rx: /\b(movie|film premiere|box office|tv show|reality show|streaming release|album release|tour announcement|red carpet)\b/i },
  { reason: 'sports',        rx: /\b(nba|nfl|nhl|mlb|fifa|world cup|super bowl|olympics|athlete|quarterback|touchdown|playoff|championship game|coach fired|trade deadline)\b/i },
  { reason: 'personal',      rx: /\b(wife|husband|boyfriend|girlfriend|ex-|love triangle|domestic dispute|neighborhood dispute|local man|local woman)\b/i },
  { reason: 'personal',      rx: /\b(breast|sexual assault on|alleged affair|divorce filing|custody battle)\b/i },
  { reason: 'lifestyle',     rx: /\b(recipe|diet|fashion|makeup|skincare|horoscope|zodiac|celebrity home|mansion tour|tiktok trend|viral video|dating app)\b/i },
];

const DENY_DOMAINS = new Set([
  'tmz.com', 'people.com', 'usmagazine.com', 'eonline.com', 'etonline.com',
  'buzzfeed.com', 'ranker.com', 'naturalnews.com',
]);
const DENY_URL_SUBSTR = ['dailymail.co.uk/tvshowbiz/', 'dailymail.co.uk/femail/'];

const parseDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// GDELT seendate format: "20260420T120000Z" → ISO
const parseSeenDate = (s: string): string => {
  if (!s || s.length < 15) return new Date().toISOString();
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  try {
    // GDELT doc 2.0 enforces an undocumented OR-term cap — empirically ~7 terms.
    // Anything more triggers "Your query was too short or too long".
    // We pick the highest-signal situational-awareness keywords. Classification
    // downstream catches related terms in titles even when not in the query.
    const query = '(war OR conflict OR cyberattack OR terrorism OR sanctions OR protest OR coup) sourcelang:english';
    const url =
      'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent(query) +
      '&mode=artlist&maxrecords=100&timespan=6h&format=json&sort=DateDesc';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'PrepPi/1.0 (situational-awareness)' },
    });
    if (!res.ok) {
      if (cached) {
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
        });
      }
      const emptyPayload = { items: [], fetchedAt: new Date().toISOString() };
      cached = { at: Date.now() - (CACHE_TTL_MS - 30_000), payload: emptyPayload };
      return new Response(JSON.stringify(emptyPayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'EMPTY' },
      });
    }

    const text = await res.text();
    let json: any = {};
    let parseFailed = false;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
      parseFailed = true;
    }
    if (parseFailed) {
      console.log('gdelt-headlines: non-JSON response from GDELT (first 200 chars):', text.slice(0, 200));
      if (cached) {
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
        });
      }
    }
    const articles: any[] = Array.isArray(json?.articles) ? json.articles : [];

    const seen = new Set<string>();
    const items: Array<{
      tag: Tag;
      title: string;
      url: string;
      country: string;
      domain: string;
      seendate: string;
    }> = [];

    let excludedCount = 0;
    const reasons: Record<string, number> = {};

    for (const art of articles) {
      const title = String(art?.title || '').trim();
      const articleUrl = String(art?.url || '').trim();
      if (!title || !articleUrl) continue;

      const domain = String(art?.domain || '').trim() || parseDomain(articleUrl);
      const lowerUrl = articleUrl.toLowerCase();

      // Domain / URL denylist
      if (DENY_DOMAINS.has(domain) || DENY_URL_SUBSTR.some((s) => lowerUrl.includes(s))) {
        excludedCount++;
        reasons.domain = (reasons.domain || 0) + 1;
        continue;
      }

      // Title-based exclusion (first match wins)
      let dropped = false;
      for (const { reason, rx } of EXCLUDE) {
        if (rx.test(title)) {
          excludedCount++;
          reasons[reason] = (reasons[reason] || 0) + 1;
          dropped = true;
          break;
        }
      }
      if (dropped) continue;

      const dedupKey = `${domain}::${title.slice(0, 80).toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      items.push({
        tag: classify(title),
        title,
        url: articleUrl,
        country: String(art?.sourcecountry || '').trim(),
        domain,
        seendate: parseSeenDate(String(art?.seendate || '')),
      });
    }

    items.sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime());
    const top = items.slice(0, 25);

    const tagCounts = top.reduce((acc, item) => {
      acc[item.tag] = (acc[item.tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const otherPct = top.length ? Math.round(((tagCounts.OTHER || 0) / top.length) * 100) : 0;
    console.log('gdelt-headlines:', {
      fetched: articles.length,
      excluded: excludedCount,
      remaining: items.length,
      reasons,
      tagCounts,
      otherPct,
    });

    const payload = { items: top, fetchedAt: new Date().toISOString() };
    cached = { at: Date.now(), payload };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    if (cached) {
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
      });
    }
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
