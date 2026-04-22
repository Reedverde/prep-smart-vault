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
  if (/(violence|attack|killed|shooting|bombing|stabbing|assault|murder|massacre|ambush)/.test(t)) return 'VIOLENCE';
  if (/(protest|demonstration|rally|march|riot|blockade)/.test(t)) return 'PROTEST';
  if (/(unrest|uprising)/.test(t)) return 'UNREST';
  if (/(earthquake|hurricane|wildfire|flood|tsunami|volcano|cyclone|typhoon|tornado)/.test(t)) return 'DISASTER';
  if (/(recession|inflation|layoffs|stock crash|bank run|default|bankruptcy)/.test(t)) return 'ECONOMIC';
  return 'OTHER';
};

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
    const url =
      'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent('(protest OR conflict OR violence OR unrest OR cyberattack OR coup OR invasion OR strike OR blockade) sourcelang:english') +
      '&mode=artlist&maxrecords=75&timespan=6h&format=json&sort=DateDesc';

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
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
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

    for (const art of articles) {
      const title = String(art?.title || '').trim();
      const articleUrl = String(art?.url || '').trim();
      if (!title || !articleUrl) continue;

      const domain = String(art?.domain || '').trim() || parseDomain(articleUrl);
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
    console.log('gdelt-headlines tag distribution:', tagCounts, 'total:', top.length, 'OTHER%:', otherPct);

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
