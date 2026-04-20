const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SourceKey = 'newsapi' | 'nws' | 'usgs' | 'cisa' | 'reliefweb';

type Item = {
  source: SourceKey;
  title: string;
  url: string;
  publishedAt: string; // ISO
  description?: string;
};

function parseRssXml(xml: string, source: SourceKey): Item[] {
  const items: Item[] = [];
  const itemRegex = /<(item|entry)[\s\S]*?<\/\1>/g;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches) {
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch =
      block.match(/<link[^>]*href="([^"]+)"/i) ||
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const dateMatch =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    const descMatch =
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);

    const title = titleMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() ?? '';
    const url = linkMatch?.[1]?.trim() ?? '';
    const dateStr = dateMatch?.[1]?.trim() ?? '';
    const desc = descMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();

    if (!title || !url) continue;
    let iso = new Date().toISOString();
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) iso = d.toISOString();
    items.push({ source, title, url, publishedAt: iso, description: desc });
  }
  return items;
}

async function safeFetchRss(
  url: string,
  source: SourceKey,
): Promise<{ items: Item[]; error?: string }> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PrepPi/1.0 (situational-awareness)' } });
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    return { items: parseRssXml(text, source) };
  } catch (e) {
    return { items: [], error: String((e as Error)?.message || e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('NEWS_API');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const state = (url.searchParams.get('state') || '').toLowerCase();

    const sourceCounts: Record<SourceKey, number> = {
      newsapi: 0, nws: 0, usgs: 0, cisa: 0, reliefweb: 0,
    };
    const sourceErrors: Partial<Record<SourceKey, string>> = {};

    // NewsAPI
    const newsPromise: Promise<{ items: Item[]; error?: string }> = (async () => {
      try {
        const r = await fetch(
          `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${apiKey}`,
        );
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try {
            const j = await r.json();
            if (j?.code) msg = `${msg} ${j.code}`;
          } catch { /* ignore */ }
          return { items: [], error: msg };
        }
        const j = await r.json();
        const items: Item[] = (j?.articles || [])
          .filter((a: any) => a?.title && a?.url)
          .map((a: any) => ({
            source: 'newsapi' as const,
            title: a.title,
            url: a.url,
            publishedAt: a.publishedAt || new Date().toISOString(),
            description: a.description,
          }));
        return { items };
      } catch (e) {
        return { items: [], error: String((e as Error)?.message || e) };
      }
    })();

    const usgsPromise = safeFetchRss(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.atom',
      'usgs',
    );
    const cisaPromise = safeFetchRss('https://www.cisa.gov/cybersecurity-advisories/all.xml', 'cisa');
    const reliefPromise = safeFetchRss('https://reliefweb.int/disasters/rss.xml', 'reliefweb');
    const nwsPromise: Promise<{ items: Item[]; error?: string }> = state
      ? safeFetchRss(`https://alerts.weather.gov/cap/${state}.php?x=0`, 'nws')
      : Promise.resolve({ items: [] });

    const [newsRes, usgsRes, cisaRes, reliefRes, nwsRes] = await Promise.all([
      newsPromise, usgsPromise, cisaPromise, reliefPromise, nwsPromise,
    ]);

    const buckets: Record<SourceKey, Item[]> = {
      newsapi: newsRes.items,
      nws: nwsRes.items,
      usgs: usgsRes.items,
      cisa: cisaRes.items,
      reliefweb: reliefRes.items,
    };

    // Counts BEFORE dedup
    (Object.keys(buckets) as SourceKey[]).forEach((k) => {
      sourceCounts[k] = buckets[k].length;
    });

    if (newsRes.error) sourceErrors.newsapi = newsRes.error;
    if (nwsRes.error) sourceErrors.nws = nwsRes.error;
    if (usgsRes.error) sourceErrors.usgs = usgsRes.error;
    if (cisaRes.error) sourceErrors.cisa = cisaRes.error;
    if (reliefRes.error) sourceErrors.reliefweb = reliefRes.error;

    // Cap each source at 3 items (sorted newest first within source) before merging
    // — prevents USGS from drowning the panel.
    const PER_SOURCE_CAP = 3;
    const capped: Item[] = [];
    (Object.keys(buckets) as SourceKey[]).forEach((k) => {
      const sorted = [...buckets[k]].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      capped.push(...sorted.slice(0, PER_SOURCE_CAP));
    });

    // Dedupe by url+title
    const seen = new Set<string>();
    const deduped: Item[] = [];
    for (const item of capped) {
      const key = `${item.url}::${item.title.slice(0, 60)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    console.log('news-feed sourceCounts', JSON.stringify(sourceCounts));
    if (Object.keys(sourceErrors).length) {
      console.log('news-feed sourceErrors', JSON.stringify(sourceErrors));
    }

    return new Response(
      JSON.stringify({ items: deduped.slice(0, 15), sourceCounts, sourceErrors }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
