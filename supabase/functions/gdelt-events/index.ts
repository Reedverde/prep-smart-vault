import { corsHeaders, requireUser } from '../_shared/auth.ts';

// In-memory cache to respect GDELT's 1-request-per-5-seconds rate limit.
// GDELT data updates every 15 min; a 10-min TTL keeps fresh data while
// drastically reducing the cold-start collisions that produce 429s.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cached: { at: number; payload: unknown } | null = null;

const STOPWORDS = new Set([
  'the','a','an','and','or','but','of','to','in','on','at','for','with','by','from',
  'as','is','was','are','were','be','been','being','it','its','this','that','these',
  'those','has','have','had','do','does','did','will','would','can','could','should',
  'may','might','must','said','says','say','new','after','before','about','into','over',
  'under','than','then','also','more','most','some','such','any','all','no','not',
]);

const tokenize = (title: string): Set<string> => {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

const parseDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// GDELT seendate is "YYYYMMDDTHHMMSSZ" — convert to ISO.
const parseSeenDate = (s: string): string => {
  if (!s || s.length < 15) return new Date().toISOString();
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const dedupeArticles = (articles: any[]): any[] => {
  // Sort newest first
  const sorted = [...articles].sort((a, b) => {
    const ad = a.seendate || '';
    const bd = b.seendate || '';
    return bd.localeCompare(ad);
  });

  const kept: { article: any; tokens: Set<string> }[] = [];
  for (const art of sorted) {
    const title = (art.title || '').toString();
    if (!title) continue;
    const tokens = tokenize(title);
    if (tokens.size === 0) continue;
    let isDupe = false;
    for (const k of kept) {
      if (jaccard(tokens, k.tokens) > 0.5) {
        isDupe = true;
        break;
      }
    }
    if (!isDupe) kept.push({ article: art, tokens });
    if (kept.length >= 5) break;
  }

  return kept.map(({ article }) => ({
    title: (article.title || '').toString(),
    url: (article.url || '').toString(),
    domain: parseDomain(article.url || ''),
    country: (article.sourcecountry || '').toString(),
    seendate: parseSeenDate(article.seendate || ''),
  }));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  // Serve from cache if fresh
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cached.payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  }

  try {
    const conflictQuery = '(conflict OR protest OR violence OR unrest)';

    const statsUrl =
      'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent(conflictQuery) +
      '&mode=artlist&maxrecords=250&timespan=7d&format=json';

    const articlesUrl =
      'https://api.gdeltproject.org/api/v2/doc/doc?query=' +
      encodeURIComponent(`${conflictQuery} sourcelang:eng`) +
      '&mode=artlist&maxrecords=25&timespan=2d&sort=DateDesc&format=json';

    const ua = { 'User-Agent': 'PrepPi/1.0 (situational-awareness)' };

    // Sequential to respect GDELT's 1-request-per-5-seconds limit.
    const statsRes = await fetch(statsUrl, { headers: ua }).catch((e) => {
      console.log('gdelt-events stats fetch threw', String(e));
      return null;
    });
    await new Promise((r) => setTimeout(r, 6000));
    const articlesRes = await fetch(articlesUrl, { headers: ua }).catch(() => null);

    if (!statsRes || !statsRes.ok) {
      const body = statsRes ? await statsRes.text().catch(() => '') : '';
      if (cached) {
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'STALE' },
        });
      }
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const emptyPayload = {
        count: 0,
        byRegion: {},
        byType: {},
        articles: [],
        from: fmt(weekAgo),
        to: fmt(today),
        degraded: true,
        upstreamStatus: statsRes?.status ?? 0,
      };
      cached = { at: Date.now() - (CACHE_TTL_MS - 60_000), payload: emptyPayload };
      console.log('gdelt-events upstream failed, returning degraded payload', {
        status: statsRes?.status ?? 'fetch_threw',
        body: body.slice(0, 200),
      });
      return new Response(JSON.stringify(emptyPayload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'DEGRADED' },
      });
    }

    // ----- Stats parse -----
    const text = await statsRes.text();
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

    // ----- Top stories parse (best-effort) -----
    let topStories: any[] = [];
    if (articlesRes && articlesRes.ok) {
      try {
        const aText = await articlesRes.text();
        const aJson = aText ? JSON.parse(aText) : {};
        const aArticles: any[] = Array.isArray(aJson?.articles) ? aJson.articles : [];
        topStories = dedupeArticles(aArticles);
      } catch (e) {
        console.log('gdelt-events articles parse failed', String(e));
        topStories = [];
      }
    } else if (articlesRes) {
      console.log('gdelt-events articles fetch non-ok', articlesRes.status);
    }

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const payload = {
      count: articles.length,
      byRegion,
      byType,
      articles: topStories,
      from: fmt(weekAgo),
      to: fmt(today),
    };
    cached = { at: Date.now(), payload };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  } catch (err) {
    console.error('gdelt-events error:', err);
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
