const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Item = {
  source: 'newsapi' | 'nws' | 'usgs' | 'cisa' | 'reliefweb';
  title: string;
  url: string;
  publishedAt: string; // ISO
  description?: string;
};

function parseRssXml(xml: string, source: Item['source']): Item[] {
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

async function safeFetchRss(url: string, source: Item['source']): Promise<Item[]> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'PrepPi/1.0 (situational-awareness)' } });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text, source);
  } catch {
    return [];
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

    const newsPromise = fetch(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=5&apiKey=${apiKey}`,
    )
      .then(async (r) => (r.ok ? await r.json() : { articles: [] }))
      .catch(() => ({ articles: [] }));

    const rssPromises: Promise<Item[]>[] = [
      safeFetchRss(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.atom`, 'usgs'),
      safeFetchRss(`https://www.cisa.gov/cybersecurity-advisories/all.xml`, 'cisa'),
      safeFetchRss(`https://reliefweb.int/disasters/rss.xml`, 'reliefweb'),
    ];
    if (state) {
      rssPromises.push(safeFetchRss(`https://alerts.weather.gov/cap/${state}.php?x=0`, 'nws'));
    }

    const [newsJson, ...rssResults] = await Promise.all([newsPromise, ...rssPromises]);

    const newsItems: Item[] = (newsJson?.articles || []).map((a: any) => ({
      source: 'newsapi' as const,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      description: a.description,
    }));

    const all = [...newsItems, ...rssResults.flat()].filter((i) => i.title && i.url);

    // Dedupe by url+title
    const seen = new Set<string>();
    const deduped: Item[] = [];
    for (const item of all) {
      const key = `${item.url}::${item.title.slice(0, 60)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    deduped.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return new Response(JSON.stringify({ items: deduped.slice(0, 10) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
