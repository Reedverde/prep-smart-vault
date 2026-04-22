const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 5 * 60 * 1000;

// FirstEnergy uses Kubra. Their public outage map iframe references a JSON config that
// points at the per-OpCo data tree. Penelec is the FirstEnergy OpCo for western PA.
// We make a best-effort attempt; if the structure has changed we degrade to "unavailable".
const KUBRA_INSTANCE = 'https://kubra.io/data/8a4ee61b-1cb9-46ad-bc26-2b7c45d6ba61/public/summary-1/data.json';

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
    message: 'FirstEnergy outage data not reachable. Will retry next refresh.',
    lawrence: null,
    paTotal: null,
    topCounties: [],
    severity: 'clear' as const,
    source: 'FirstEnergy (Penelec)',
    scrapedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch(KUBRA_INSTANCE, {
      headers: { Accept: 'application/json', 'User-Agent': 'PrepPi/1.0' },
    });
    if (res.ok) {
      const json = await res.json();
      // Kubra summary structure varies; try several common shapes defensively.
      const areas: any[] = json?.file_data?.areas || json?.areas || json?.summaryFileData?.areas || [];
      const counties = areas
        .map((a: any) => ({
          name: String(a?.area_name || a?.name || '').trim(),
          customers: Number(a?.cust_a?.val ?? a?.customersAffected ?? a?.customers ?? 0),
          outages: Number(a?.n_out_a?.val ?? a?.outageCount ?? a?.outages ?? 0),
        }))
        .filter((c) => c.name);

      if (counties.length) {
        const lawrence = counties.find((c) => /lawrence/i.test(c.name)) || null;
        const paTotal = counties.reduce((s, c) => s + (c.customers || 0), 0);
        const topCounties = [...counties]
          .sort((a, b) => b.customers - a.customers)
          .slice(0, 5)
          .filter((c) => c.customers > 0);

        payload = {
          status: 'ok',
          lawrence: lawrence
            ? { customers: lawrence.customers, outages: lawrence.outages }
            : { customers: 0, outages: 0 },
          paTotal,
          topCounties,
          severity: severityFor(lawrence?.customers ?? 0),
          source: 'FirstEnergy (Penelec)',
          scrapedAt: new Date().toISOString(),
        };
      } else {
        console.log('power-outages: kubra returned unexpected shape', Object.keys(json || {}));
      }
    } else {
      console.log('power-outages: kubra responded', res.status);
    }
  } catch (err) {
    console.log('power-outages: scrape failed', String(err));
  }

  cache = { ts: Date.now(), payload };
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
