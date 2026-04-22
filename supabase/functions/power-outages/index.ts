import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 5 * 60 * 1000;

const LAWRENCE_URL = 'https://data.tcpalm.com/national-power-outage-map-tracker/area/lawrence-county-pa/42073/';
const PA_URL = 'https://data.tcpalm.com/national-power-outage-map-tracker/area/pennsylvania/42/';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

const severityFor = (n: number): 'clear' | 'localized' | 'widespread' => {
  if (n <= 0) return 'clear';
  if (n < 1000) return 'localized';
  return 'widespread';
};

type Parsed = { tracked: number | null; latestOut: number | null; status: 'ok' | 'partial' | 'failed' };

const parsePage = (html: string): Parsed => {
  // Tracked customers — stable label in panel-body
  const trackedMatch = html.match(/Total tracked customers:\s*([\d,]+)/i);
  const tracked = trackedMatch ? Number(trackedMatch[1].replace(/,/g, '')) : null;

  // Chart series: barChartData { labels: [...], datasets: [{ data: [n, n, n, ...] }] }
  // Grab the first numeric `data: [ ... ]` array after `barChartData`.
  let latestOut: number | null = null;
  const chartIdx = html.indexOf('barChartData');
  if (chartIdx >= 0) {
    const chunk = html.slice(chartIdx, chartIdx + 200_000);
    const dataMatch = chunk.match(/['"]?data['"]?\s*:\s*\[([\d,\s.]+)\]/);
    if (dataMatch) {
      const nums = dataMatch[1]
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      if (nums.length > 0) latestOut = nums[nums.length - 1];
    }
  }

  if (tracked != null && latestOut != null) return { tracked, latestOut, status: 'ok' };
  if (tracked != null) return { tracked, latestOut: 0, status: 'partial' };
  return { tracked: null, latestOut: null, status: 'failed' };
};

const fetchPage = async (url: string): Promise<{ html: string | null; code: number }> => {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return { html: null, code: res.status };
    return { html: await res.text(), code: res.status };
  } catch (err) {
    console.error('power-outages: fetch failed', url, String(err));
    return { html: null, code: 0 };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  }

  const fallback: any = {
    status: 'unavailable',
    message: 'PowerOutage.us mirror temporarily unreachable.',
    lawrence: null,
    paTotal: null,
    topCounties: [],
    severity: 'clear' as const,
    source: 'PowerOutage.us (via Gannett)',
    sourceUrl: LAWRENCE_URL,
    scrapedAt: new Date().toISOString(),
  };

  const [lawRes, paRes] = await Promise.all([fetchPage(LAWRENCE_URL), fetchPage(PA_URL)]);

  if (!lawRes.html && !paRes.html) {
    console.log(JSON.stringify({ fn: 'power-outages', lawCode: lawRes.code, paCode: paRes.code, result: 'unavailable' }));
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const law = lawRes.html ? parsePage(lawRes.html) : { tracked: null, latestOut: null, status: 'failed' as const };
  const pa = paRes.html ? parsePage(paRes.html) : { tracked: null, latestOut: null, status: 'failed' as const };

  if (law.status === 'failed' && pa.status === 'failed') {
    console.log(JSON.stringify({
      fn: 'power-outages',
      lawCode: lawRes.code,
      paCode: paRes.code,
      parseStatus: 'failed',
      sample: (lawRes.html || paRes.html || '').slice(0, 300),
    }));
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const lawCustomers = law.latestOut ?? 0;
  const payload: any = {
    status: 'ok',
    lawrence: { customers: lawCustomers, outages: null, tracked: law.tracked },
    paTotal: pa.latestOut ?? null,
    paTracked: pa.tracked ?? null,
    topCounties: [],
    severity: severityFor(lawCustomers),
    source: 'PowerOutage.us (via Gannett)',
    sourceUrl: LAWRENCE_URL,
    scrapedAt: new Date().toISOString(),
    parseStatus: law.status === 'ok' && pa.status === 'ok' ? 'ok' : 'partial',
  };

  console.log(JSON.stringify({
    fn: 'power-outages',
    lawrenceTracked: law.tracked,
    lawrenceOut: law.latestOut,
    paOut: pa.latestOut,
    paTracked: pa.tracked,
    parseStatus: payload.parseStatus,
  }));

  cache = { ts: Date.now(), payload };

  return new Response(JSON.stringify(payload), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
    },
  });
});
