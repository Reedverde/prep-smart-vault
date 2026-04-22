import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 5 * 60 * 1000;

// Power outage data sources we've evaluated:
//   • FirstEnergy/Kubra hardcoded UUID — 404 (utility reorganized portal)
//   • PowerOutage.us /api/web/states  — 401 from Deno edge (requires session/auth)
// Until we either find a public no-auth endpoint or run a browser-based scrape
// from the Pi tier, this panel ships in a graceful "unavailable" state.

const severityFor = (n: number): 'clear' | 'localized' | 'widespread' => {
  if (n <= 0) return 'clear';
  if (n < 1000) return 'localized';
  return 'widespread';
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

  // Default unavailable payload — shape matches the panel's expectations so it
  // renders its dim "no data" state instead of erroring.
  const payload: any = {
    status: 'unavailable',
    message: 'Public outage feeds for FirstEnergy/Penelec are not currently reachable from the cloud tier. Will be re-enabled once a viable source is found.',
    lawrence: null,
    paTotal: null,
    topCounties: [],
    severity: 'clear' as const,
    source: 'Power outage data',
    scrapedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('https://poweroutage.us/api/web/states', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PrepPi/1.0)',
      },
    });
    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const rows: any[] = Array.isArray(json) ? json : (json?.WebStateRecords || []);
        const pa = rows.find((s: any) => /pennsylvania/i.test(String(s?.StateName || s?.state_name || '')));
        if (pa) {
          const paTotal = Number(pa?.CustomersOut ?? pa?.customers_out ?? 0);
          payload.status = 'ok';
          payload.paTotal = paTotal;
          payload.lawrence = { customers: 0, outages: 0 };
          payload.severity = severityFor(0);
          payload.source = 'PowerOutage.us';
          payload.message = undefined;
        }
      } catch {
        console.log('power-outages: poweroutage.us non-JSON (first 200):', text.slice(0, 200));
      }
    } else {
      const body = await res.text().catch(() => '');
      console.log('power-outages: poweroutage.us', res.status, body.slice(0, 200));
    }
  } catch (err) {
    console.error('power-outages probe failed:', err);
  }

  cache = { ts: Date.now(), payload };
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
