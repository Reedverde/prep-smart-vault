import { corsHeaders } from '../_shared/auth.ts';
import { serveCached, cacheHeaders } from '../_shared/cache.ts';

const FRESH_MS = 5 * 60 * 1000;
const STALE_MAX_MS = 24 * 60 * 60 * 1000;

const PA_URL = 'https://poweroutage.us/area/state/pennsylvania';
// Cloudflare blocks direct hits from cloud-provider IPs (Supabase Edge runs on AWS),
// so we proxy through r.jina.ai's reader, which serves the same HTML and preserves
// the embedded SvelteKit hydration data we parse.
const PROXY_URL = `https://r.jina.ai/${PA_URL}`;

const HEADERS_DIRECT = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

const HEADERS_PROXY = {
  'User-Agent': 'Mozilla/5.0 (PrepPi/1.0)',
  'X-Return-Format': 'html',
  Accept: 'text/html',
};

const severityFor = (lawrenceOut: number, paOut: number): 'clear' | 'localized' | 'widespread' => {
  if (lawrenceOut >= 500 || paOut >= 50_000) return 'widespread';
  if (lawrenceOut > 0 || paOut >= 2_000) return 'localized';
  return 'clear';
};

type CountyRow = { name: string; customersOut: number; customersTracked: number };
type UtilityRow = { name: string; customersOut: number; customersTracked: number };

interface ParsedData {
  stateOut: number | null;
  stateTracked: number | null;
  stateStatus: string | null;
  topCountyName: string | null;
  topCountyOut: number | null;
  counties: CountyRow[];
  lawrence: CountyRow | null;
  utilities: UtilityRow[];
}

const parsePage = (html: string): ParsedData => {
  // ---- PA state object ----
  // {stateId:41,...stateName:"Pennsylvania"...outageCount:3237,customerCount:6765006,...
  //  countyWithMostOutages:"Lycoming",countyWithMostOutagesOutageCount:790,...}
  let stateOut: number | null = null;
  let stateTracked: number | null = null;
  let stateStatus: string | null = null;
  let topCountyName: string | null = null;
  let topCountyOut: number | null = null;

  const stateRe = /\{stateId:41,[^}]*stateName:"Pennsylvania"[^}]*\}/g;
  const stateMatch = stateRe.exec(html);
  if (stateMatch) {
    const obj = stateMatch[0];
    const out = obj.match(/outageCount:(\d+)/);
    const cust = obj.match(/customerCount:(\d+)/);
    const status = obj.match(/status:"([^"]+)"/);
    const topName = obj.match(/countyWithMostOutages:"([^"]+)"/);
    const topOut = obj.match(/countyWithMostOutagesOutageCount:(\d+)/);
    if (out) stateOut = Number(out[1]);
    if (cust) stateTracked = Number(cust[1]);
    if (status) stateStatus = status[1];
    if (topName) topCountyName = topName[1];
    if (topOut) topCountyOut = Number(topOut[1]);
  }

  // ---- Utilities serving PA ----
  // stateName:"Pennsylvania",utilityName:"PPL Electric Utilities",outageCount:1278,customerCount:1950029
  const utilities: UtilityRow[] = [];
  const utilRe =
    /stateName:"Pennsylvania",utilityName:"([^"]+)",outageCount:(\d+),customerCount:(\d+)/g;
  let um: RegExpExecArray | null;
  while ((um = utilRe.exec(html)) !== null) {
    utilities.push({
      name: um[1],
      customersOut: Number(um[2]),
      customersTracked: Number(um[3]),
    });
  }

  // ---- Counties (Form A: object literal) ----
  // {countyId:NNN,stateId:41,countyName:"X",outageCount:N,customerCount:N,...}
  const counties: CountyRow[] = [];
  const seen = new Set<string>();
  const countyReA =
    /\{countyId:\d+,stateId:41,countyName:"([^"]+)",outageCount:(\d+),customerCount:(\d+)/g;
  let cm: RegExpExecArray | null;
  while ((cm = countyReA.exec(html)) !== null) {
    const name = cm[1];
    if (seen.has(name)) continue;
    seen.add(name);
    counties.push({
      name,
      customersOut: Number(cm[2]),
      customersTracked: Number(cm[3]),
    });
  }

  // ---- Counties (Form B: hydration assignment style) ----
  // X.countyId=NNN;X.stateId=41;X.countyName="Y";X.outageCount=N;X.customerCount=N;
  const countyReB =
    /\.countyId=\d+;[A-Z]+\.stateId=41;[A-Z]+\.countyName="([^"]+)";[A-Z]+\.outageCount=(\d+);[A-Z]+\.customerCount=(\d+)/g;
  while ((cm = countyReB.exec(html)) !== null) {
    const name = cm[1];
    if (seen.has(name)) continue;
    seen.add(name);
    counties.push({
      name,
      customersOut: Number(cm[2]),
      customersTracked: Number(cm[3]),
    });
  }

  const lawrence = counties.find((c) => c.name === 'Lawrence') ?? null;

  return {
    stateOut,
    stateTracked,
    stateStatus,
    topCountyName,
    topCountyOut,
    counties,
    lawrence,
    utilities,
  };
};

const fetchPage = async (url: string): Promise<{ html: string | null; code: number }> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
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
  const { html, code } = await fetchPage(PA_URL);
  if (!html) throw new Error(`upstream fetch failed code=${code}`);

  const parsed = parsePage(html);
  if (parsed.stateOut == null || parsed.stateTracked == null) {
    throw new Error('upstream parse failed: state totals missing');
  }

  // Top affected counties (excluding zero-outage and Lawrence; Lawrence shown separately)
  const topCounties = parsed.counties
    .filter((c) => c.customersOut > 0 && c.name !== 'Lawrence')
    .sort((a, b) => b.customersOut - a.customersOut)
    .slice(0, 8);

  const byUtility = parsed.utilities
    .sort((a, b) => b.customersTracked - a.customersTracked)
    .slice(0, 8);

  const lawrenceOut = parsed.lawrence?.customersOut ?? 0;

  return {
    status: 'ok' as const,
    source: 'PowerOutage.us',
    sourceUrl: PA_URL,
    scrapedAt: new Date().toISOString(),
    state: {
      customersOut: parsed.stateOut,
      customersTracked: parsed.stateTracked,
      status: parsed.stateStatus,
      topCountyName: parsed.topCountyName,
      topCountyOut: parsed.topCountyOut,
    },
    lawrence: parsed.lawrence
      ? {
          customersOut: parsed.lawrence.customersOut,
          customersTracked: parsed.lawrence.customersTracked,
        }
      : null,
    topCounties,
    byUtility,
    severity: severityFor(lawrenceOut, parsed.stateOut),
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const forceFresh = url.searchParams.get('fresh') === '1';

  try {
    const result = await serveCached({
      key: 'power-outages:pa-v2',
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
      status: 'unavailable' as const,
      message:
        "Live PA outage feed is temporarily unavailable. We'll show the last known totals once a fetch succeeds.",
      source: 'PowerOutage.us',
      sourceUrl: PA_URL,
      scrapedAt: new Date().toISOString(),
      state: null,
      lawrence: null,
      topCounties: [],
      byUtility: [],
      severity: 'clear' as const,
    };
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, 'X-Cache': 'empty', 'Content-Type': 'application/json' },
    });
  }
});
