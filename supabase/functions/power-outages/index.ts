const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 5 * 60 * 1000;

// PowerOutage.us aggregates utility outage data nationally. Public web API,
// no auth required. Replaces the dead FirstEnergy/Kubra UUID scrape.
const STATES_URL = 'https://poweroutage.us/api/web/states';
const COUNTIES_URL = 'https://poweroutage.us/api/web/counties?statename=Pennsylvania';

const severityFor = (n: number): 'clear' | 'localized' | 'widespread' => {
  if (n <= 0) return 'clear';
  if (n < 1000) return 'localized';
  return 'widespread';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: any = {
    status: 'unavailable',
    message: 'Outage data not reachable. Will retry next refresh.',
    lawrence: null,
    paTotal: null,
    topCounties: [],
    severity: 'clear' as const,
    source: 'PowerOutage.us',
    scrapedAt: new Date().toISOString(),
  };

  try {
    const headers = {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; PrepPi/1.0)',
    };

    const [statesRes, countiesRes] = await Promise.all([
      fetch(STATES_URL, { headers }),
      fetch(COUNTIES_URL, { headers }),
    ]);

    if (!statesRes.ok) {
      const body = await statesRes.text().catch(() => '');
      console.log('power-outages: states endpoint', statesRes.status, body.slice(0, 200));
    }
    if (!countiesRes.ok) {
      const body = await countiesRes.text().catch(() => '');
      console.log('power-outages: counties endpoint', countiesRes.status, body.slice(0, 200));
    }

    if (statesRes.ok && countiesRes.ok) {
      const statesText = await statesRes.text();
      const countiesText = await countiesRes.text();

      let statesJson: any = null;
      let countiesJson: any = null;
      try { statesJson = JSON.parse(statesText); } catch {
        console.log('power-outages: states non-JSON (first 200):', statesText.slice(0, 200));
      }
      try { countiesJson = JSON.parse(countiesText); } catch {
        console.log('power-outages: counties non-JSON (first 200):', countiesText.slice(0, 200));
      }

      // Defensive shape extraction — PowerOutage.us has occasionally returned
      // either a bare array or { WebStateRecords: [...] }.
      const stateRows: any[] = Array.isArray(statesJson)
        ? statesJson
        : (statesJson?.WebStateRecords || statesJson?.states || []);
      const countyRows: any[] = Array.isArray(countiesJson)
        ? countiesJson
        : (countiesJson?.WebCountyRecords || countiesJson?.counties || []);

      const paState = stateRows.find((s: any) =>
        /pennsylvania/i.test(String(s?.StateName || s?.state_name || s?.name || ''))
      );
      const paTotal = paState
        ? Number(paState?.CustomersOut ?? paState?.customers_out ?? paState?.customersOut ?? 0)
        : null;

      const counties = countyRows
        .map((c: any) => ({
          name: String(c?.CountyName || c?.county_name || c?.name || '').trim(),
          customers: Number(c?.CustomersOut ?? c?.customers_out ?? c?.customersOut ?? 0),
          outages: Number(c?.OutageCount ?? c?.outage_count ?? c?.outages ?? 0),
        }))
        .filter((c: any) => c.name);

      const lawrence = counties.find((c: any) => /^lawrence$/i.test(c.name)) || null;
      const topCounties = [...counties]
        .sort((a: any, b: any) => b.customers - a.customers)
        .slice(0, 5)
        .filter((c: any) => c.customers > 0);

      if (paTotal !== null || counties.length > 0) {
        payload = {
          status: 'ok',
          lawrence: lawrence
            ? { customers: lawrence.customers, outages: lawrence.outages }
            : { customers: 0, outages: 0 },
          paTotal: paTotal ?? 0,
          topCounties,
          severity: severityFor(lawrence?.customers ?? 0),
          source: 'PowerOutage.us',
          scrapedAt: new Date().toISOString(),
        };
      } else {
        console.log('power-outages: parsed but empty', {
          stateRows: stateRows.length,
          countyRows: countyRows.length,
        });
      }
    }
  } catch (err) {
    console.log('power-outages: fetch failed', String(err));
  }

  cache = { ts: Date.now(), payload };
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
