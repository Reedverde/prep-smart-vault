const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache to respect GDELT's 1-request-per-5-seconds rate limit.
// 5-min cache balances freshness against the upstream limit.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; payload: unknown } | null = null;

type Tag = 'CYBER' | 'COUP' | 'INVASION' | 'CONFLICT' | 'VIOLENCE' | 'PROTEST' | 'UNREST' | 'OTHER';

const classify = (title: string): Tag => {
  const t = title.toLowerCase();
  if (/(cyber|hack|ransomware|breach)/.test(t)) return 'CYBER';
  if (/coup/.test(t)) return 'COUP';
  if (/(invasion|invade)/.test(t)) return 'INVASION';
  if (/(conflict|war|military|airstrike|shelling)/.test(t)) return 'CONFLICT';
  if (/(violence|attack|killed|shooting)/.test(t)) return 'VIOLENCE';
  if (/(protest|demonstration|rally)/.test(t)) return 'PROTEST';
  if (/(unrest|riot|clash)/.test(t)) return 'UNREST';
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
      encodeURIComponent('(protest OR conflict OR violence OR unrest OR cyberattack OR coup OR invasion OR strike OR blockade)') +
      '&mode=artlist&maxrecords=50&timespan=6h&format=json&sort=DateDesc';

    const res = await fetch(url, {
      headers: { 'User-Agent': 'PrepPi/1.0 (situational-awareness)' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (cached) {
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
        });
      }
      return new Response(
        JSON.stringify({ error: 'upstream_failed', status: res.status, upstream: body.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
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
    const top = items.slice(0, 10);

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
