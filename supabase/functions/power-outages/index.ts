import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 5 * 60 * 1000;

// Kubra Storm Center IDs for FirstEnergy/Penelec PA portal
// (https://outages-pa.firstenergycorp.com)
const INST = '6c715f0e-bbec-465f-98cc-0b81623744be';
const VIEW = '8587e451-e258-4692-b5e8-28010506d51a';

const severityFor = (n: number): 'clear' | 'localized' | 'widespread' => {
  if (n <= 0) return 'clear';
  if (n < 1000) return 'localized';
  return 'widespread';
};

const KUBRA_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; PrepPi/1.0)',
  Referer: 'https://outages-pa.firstenergycorp.com/',
};

const fetchDeployment = async (): Promise<string | null> => {
  try {
    const url = `https://kubra.io/stormcenter/api/v1/stormcenters/${INST}/views/${VIEW}/currentState`;
    const res = await fetch(url, { headers: KUBRA_HEADERS });
    if (!res.ok) {
      console.log('power-outages: currentState non-ok', res.status);
      return null;
    }
    const json = await res.json();
    // currentState typically returns { data: { interval_generation_data: '<DEP-ID>' }, ... }
    const dep =
      json?.data?.interval_generation_data ||
      json?.interval_generation_data ||
      json?.data?.deployment_id ||
      null;
    if (typeof dep === 'string' && dep.length > 0) return dep;
    console.log('power-outages: currentState no deployment id, keys:', Object.keys(json?.data || json || {}));
    return null;
  } catch (err) {
    console.error('power-outages: currentState fetch failed', err);
    return null;
  }
};

const SUMMARY_PATTERNS = (dep: string) => [
  `https://kubra.io/data/${INST}/public/${dep}/summary-1/data.json`,
  `https://kubra.io/data/${INST}/public/${dep}/report.json`,
  `https://kubra.io/data/${INST}/public/${dep}/thematic-1/data.json`,
  `https://kubra.io/data/${INST}/${dep}/summary-1/data.json`,
];

const tryFetchSummary = async (dep: string) => {
  const attempts: Array<{ path: string; code: number }> = [];
  for (const url of SUMMARY_PATTERNS(dep)) {
    try {
      const res = await fetch(url, { headers: KUBRA_HEADERS });
      attempts.push({ path: url.replace('https://kubra.io', ''), code: res.status });
      if (res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          return { json, url, attempts };
        } catch {
          console.log('power-outages: non-JSON from', url, text.slice(0, 200));
        }
      }
    } catch (err) {
      attempts.push({ path: url.replace('https://kubra.io', ''), code: 0 });
      console.log('power-outages: fetch error for', url, String(err));
    }
  }
  return { json: null, url: null, attempts };
};

const parseKubraSummary = (json: any) => {
  // Kubra summary commonly has: { total_cust_a_out, n_out, file_data: [{ area_name, cust_a, ... }] }
  // But shape varies — be defensive.
  const totalOut =
    Number(json?.total_cust_a_out ?? json?.summary?.total_cust_a_out ?? json?.totals?.cust_a_out ?? 0) || 0;
  const rows: any[] = Array.isArray(json?.file_data)
    ? json.file_data
    : Array.isArray(json?.areas)
      ? json.areas
      : Array.isArray(json?.data)
        ? json.data
        : [];

  const counties = rows
    .map((r) => ({
      name: String(r?.area_name ?? r?.name ?? r?.county ?? '').trim(),
      customers: Number(r?.cust_a ?? r?.cust_out ?? r?.customers_out ?? 0) || 0,
      outages: Number(r?.n_out ?? r?.outages ?? 0) || 0,
    }))
    .filter((c) => c.name.length > 0);

  const lawrenceRow = counties.find((c) => /lawrence/i.test(c.name));
  const top = [...counties].sort((a, b) => b.customers - a.customers).slice(0, 5);

  return {
    paTotal: totalOut,
    lawrence: lawrenceRow ? { customers: lawrenceRow.customers, outages: lawrenceRow.outages } : { customers: 0, outages: 0 },
    topCounties: top,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const payload: any = {
    status: 'unavailable',
    message: 'FirstEnergy/Penelec outage feed reachable but summary path not yet mapped. Logs capture deployment id + attempted paths.',
    lawrence: null,
    paTotal: null,
    topCounties: [],
    severity: 'clear' as const,
    source: 'FirstEnergy/Kubra',
    scrapedAt: new Date().toISOString(),
  };

  const deployment = await fetchDeployment();
  if (!deployment) {
    console.log(JSON.stringify({ fn: 'power-outages', deployment: null, attempts: [], result: 'unavailable' }));
    // Don't cache failure for full 5 min — short-cache so we recover quickly
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { json, url, attempts } = await tryFetchSummary(deployment);

  if (json) {
    const parsed = parseKubraSummary(json);
    payload.status = 'ok';
    payload.message = undefined;
    payload.paTotal = parsed.paTotal;
    payload.lawrence = parsed.lawrence;
    payload.topCounties = parsed.topCounties;
    payload.severity = severityFor(parsed.lawrence?.customers ?? 0);
    payload.source = 'FirstEnergy (Kubra)';
    console.log(JSON.stringify({ fn: 'power-outages', deployment, attempts, matched: url, result: 'ok' }));
    cache = { ts: Date.now(), payload };
  } else {
    console.log(JSON.stringify({ fn: 'power-outages', deployment, attempts, result: 'unavailable' }));
    // Don't cache failure
  }

  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
