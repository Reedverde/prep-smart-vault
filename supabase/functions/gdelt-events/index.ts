const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache to respect GDELT's 1-request-per-5-seconds rate limit.
// GDELT data updates every 15 min; 5-min cache is plenty fresh and prevents
// 429s from concurrent clients / dashboard auto-refreshes hitting the function.
const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; payload: unknown } | null = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Serve from cache if fresh
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  try {
    const url =
      'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent('(conflict OR protest OR violence OR unrest)') +
      '&mode=artlist&maxrecords=250&timespan=7d&format=json';

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
      // No cache + upstream failed (often GDELT 429 on cold start): return
      // empty-but-valid payload so dashboard renders. Cache briefly (1 min)
      // so we retry soon without hammering GDELT.
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const emptyPayload = {
        count: 0,
        byRegion: {},
        byType: {},
        from: fmt(weekAgo),
        to: fmt(today),
        degraded: true,
        upstreamStatus: res.status,
      };
      cached = { at: Date.now() - (CACHE_TTL_MS - 60_000), payload: emptyPayload };
      console.log('gdelt-events upstream failed, returning degraded payload', {
        status: res.status,
        body: body.slice(0, 200),
      });
      return new Response(JSON.stringify(emptyPayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'DEGRADED' },
      });
    }

    // GDELT sometimes returns text/html for empty/throttled responses; guard parse.
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    const articles: any[] = Array.isArray(json?.articles) ? json.articles : [];

    const byRegion: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const art of articles) {
      const region = (art.sourcecountry || 'Unknown').toString();
      byRegion[region] = (byRegion[region] || 0) + 1;

      const title = (art.title || '').toString().toLowerCase();
      let bucket = 'Other';
      if (title.includes('protest')) bucket = 'Protest';
      else if (title.includes('conflict')) bucket = 'Conflict';
      else if (title.includes('violence')) bucket = 'Violence';
      else if (title.includes('unrest')) bucket = 'Unrest';
      byType[bucket] = (byType[bucket] || 0) + 1;
    }

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const payload = {
      count: articles.length,
      byRegion,
      byType,
      from: fmt(weekAgo),
      to: fmt(today),
    };
    cached = { at: Date.now(), payload };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
