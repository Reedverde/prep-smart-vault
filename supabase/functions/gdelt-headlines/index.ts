import { corsHeaders, requireUser } from '../_shared/auth.ts';
import { serveCached, cacheHeaders } from '../_shared/cache.ts';

const CACHE_KEY = 'gdelt-headlines:v1';
const FRESH_MS = 10 * 60 * 1000;         // serve cache instantly if newer than 10 min
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // fall back up to 24 h on upstream failure

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
  if (/(cyber|hack|ransomware|breach|malware|phishing|data leak|exploit|zero[- ]day|ddos)/.test(t)) return 'CYBER';
  if (/coup/.test(t)) return 'COUP';
  if (/(invasion|invade)/.test(t)) return 'INVASION';
  if (/(conflict|war|military|airstrike|shelling|offensive|missile|drone strike|skirmish|clash)/.test(t)) return 'CONFLICT';
  if (/(violence|attack|killed|shooting|bombing|stabbing|assault|murder|massacre|ambush|terror|terrorism)/.test(t)) return 'VIOLENCE';
  if (/(election|parliament|congress|legislation|diplomatic|summit|treaty|sanctions|ceasefire|tariff|embargo|\bpolicy\b)/.test(t)) return 'POLITICAL';
  if (/(protest|demonstration|rally|march|riot|blockade)/.test(t)) return 'PROTEST';
  if (/(unrest|uprising)/.test(t)) return 'UNREST';
  if (/(earthquake|hurricane|wildfire|flood|tsunami|volcano|cyclone|typhoon|tornado)/.test(t)) return 'DISASTER';
  if (/(recession|inflation|layoffs|stock crash|bank run|default|bankruptcy|currency crisis|trade war|opec|oil prices)/.test(t)) return 'ECONOMIC';
  return 'OTHER';
};

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
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

const parseSeenDate = (s: string): string => {
  if (!s || s.length < 15) return new Date().toISOString();
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

type Headline = {
  tag: Tag;
  title: string;
  url: string;
  country: string;
  domain: string;
  seendate: string;
};

type Payload = { items: Headline[]; fetchedAt: string };

const fetchGdelt = async (): Promise<Payload> => {
  // Stagger behind gdelt-events to avoid GDELT's 1-req-per-5s rate limit.
  await new Promise((r) => setTimeout(r, 6000));

  const query = '(war OR conflict OR cyberattack OR terrorism OR sanctions OR protest OR coup) sourcelang:english';
  const url =
    'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
    encodeURIComponent(query) +
    '&mode=artlist&maxrecords=100&timespan=6h&format=json&sort=DateDesc';

  const res = await fetch(url, { headers: { 'User-Agent': 'PrepPi/1.0 (situational-awareness)' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`gdelt upstream ${res.status}: ${body.slice(0, 120)}`);
  }

  const text = await res.text();
  let json: any;
  try { json = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`gdelt non-JSON response: ${text.slice(0, 120)}`); }

  const articles: any[] = Array.isArray(json?.articles) ? json.articles : [];
  if (articles.length === 0) throw new Error('gdelt returned zero articles');

  const seen = new Set<string>();
  const items: Headline[] = [];
  let excludedCount = 0;
  const reasons: Record<string, number> = {};

  for (const art of articles) {
    const title = String(art?.title || '').trim();
    const articleUrl = String(art?.url || '').trim();
    if (!title || !articleUrl) continue;

    const domain = String(art?.domain || '').trim() || parseDomain(articleUrl);
    const lowerUrl = articleUrl.toLowerCase();

    if (DENY_DOMAINS.has(domain) || DENY_URL_SUBSTR.some((s) => lowerUrl.includes(s))) {
      excludedCount++; reasons.domain = (reasons.domain || 0) + 1; continue;
    }

    let dropped = false;
    for (const { reason, rx } of EXCLUDE) {
      if (rx.test(title)) { excludedCount++; reasons[reason] = (reasons[reason] || 0) + 1; dropped = true; break; }
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
  if (top.length === 0) throw new Error('gdelt: all articles filtered out');

  console.log('gdelt-headlines:', { fetched: articles.length, excluded: excludedCount, kept: top.length, reasons });

  return { items: top, fetchedAt: new Date().toISOString() };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  try {
    const result = await serveCached<Payload>({
      key: CACHE_KEY,
      freshMs: FRESH_MS,
      staleMaxAgeMs: STALE_MAX_AGE_MS,
      fetcher: fetchGdelt,
    });

    // Mark stale-cache responses so the Stability Check can label them.
    const body: Payload & { stale?: boolean; cacheSource?: string } = {
      ...result.payload,
      cacheSource: result.source,
      stale: result.source === 'cache-stale',
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        ...corsHeaders,
        ...cacheHeaders(result),
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    // Upstream failed AND no usable cache. Do NOT poison cache with [].
    const message = err instanceof Error ? err.message : String(err);
    console.warn('gdelt-headlines: degraded (no cache):', message);
    return new Response(
      JSON.stringify({ items: [], fetchedAt: new Date().toISOString(), degraded: true, error: message.slice(0, 200) }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'degraded',
          'Cache-Control': 'no-store',
        },
      },
    );
  }
});
