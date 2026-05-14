import { corsHeaders } from '../_shared/auth.ts';
import { serveCached, cacheHeaders } from '../_shared/cache.ts';

const FRESH_MS = 5 * 60 * 1000;            // 5 min — outage data changes fast
const STALE_MAX_MS = 24 * 60 * 60 * 1000;  // 24 h — keep showing last good number

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
  const trackedMatch = html.match(/Total tracked customers:\s*([\d,]+)/i);
  const tracked = trackedMatch ? Number(trackedMatch[1].replace(/,/g, '')) : null;

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
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { html: null, code: res.status };
    return { html: await res.text(), code: res.status };
  } catch (err) {
    console.error('power-outages: fetch failed', url, String(err));
    return { html: null, code: 0 };
  }
};

const fetchOutages = async () => {
  const [lawRes, paRes] = await Promise.all([fetchPage(LAWRENCE_URL), fetchPage(PA_URL)]);

  const law = lawRes.html ? parsePage(lawRes.html) : { tracked: null, latestOut: null, status: 'failed' as const };
  const pa = paRes.html ? parsePage(paRes.html) : { tracked: null, latestOut: null, status: 'failed' as const };

  if (law.status === 'failed' && pa.status === 'failed') {
    throw new Error(`upstream parse failed lawCode=${lawRes.code} paCode=${paRes.code}`);
  }

  const lawCustomers = law.latestOut ?? 0;
  return {
    status: 'ok' as const,
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
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const forceFresh = url.searchParams.get('fresh') === '1';

  try {
    const result = await serveCached({
      key: 'power-outages:lawrence-pa',
      freshMs: FRESH_MS,
      staleMaxAgeMs: STALE_MAX_MS,
      forceFresh,
      fetcher: fetchOutages,
    });
    return new Response(JSON.stringify(result.payload), {
      status: 200,
      headers: { ...corsHeaders, ...cacheHeaders(result), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('power-outages: no cache + upstream failed:', err);
    const fallback = {
      status: 'unavailable',
      message:
        "Live county outage feed is currently unstable. We'll show last known totals as soon as one good fetch succeeds.",
      lawrence: null,
      paTotal: null,
      topCounties: [],
      severity: 'clear' as const,
      source: 'PowerOutage.us (via Gannett)',
      sourceUrl: LAWRENCE_URL,
      scrapedAt: new Date().toISOString(),
    };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, 'X-Cache': 'empty', 'Content-Type': 'application/json' },
    });
  }
});
