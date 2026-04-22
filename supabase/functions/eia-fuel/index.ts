const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 60 * 60 * 1000;

const fetchSeries = async (apiKey: string, seriesId: string) => {
  const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?frequency=weekly&data[0]=value&facets[series][]=${seriesId}&sort[0][column]=period&sort[0][direction]=desc&length=12&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`eia ${seriesId} ${res.status}`);
  const json = await res.json();
  const rows = (json?.response?.data || [])
    .map((r: any) => ({ period: r.period, value: Number(r.value) }))
    .filter((r: any) => Number.isFinite(r.value));
  return rows;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('EIA_APP_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ notConfigured: true, key: 'EIA_APP_KEY' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const [regional, national] = await Promise.all([
      fetchSeries(apiKey, 'EMM_EPMR_PTE_R10_DPG'),
      fetchSeries(apiKey, 'EMM_EPMR_PTE_NUS_DPG'),
    ]);

    // regional/national come desc — work on asc series for sparkline
    const regAsc = [...regional].reverse();
    const latest = regional[0]?.value ?? null;
    const prior = regional[1]?.value ?? null;
    const fourBack = regional[3]?.value ?? null;
    const wow = latest != null && prior != null ? latest - prior : null;
    const wowPct = latest != null && prior != null && prior !== 0 ? ((latest - prior) / prior) * 100 : null;
    const fourWeekPct = latest != null && fourBack != null && fourBack !== 0
      ? ((latest - fourBack) / fourBack) * 100
      : null;
    const spike =
      (wowPct != null && Math.abs(wowPct) > 5) ||
      (fourWeekPct != null && Math.abs(fourWeekPct) > 10);

    const payload = {
      regional: {
        latest,
        prior,
        wow,
        wowPct,
        fourWeekPct,
        series: regAsc,
        latestPeriod: regional[0]?.period ?? null,
      },
      national: { latest: national[0]?.value ?? null, latestPeriod: national[0]?.period ?? null },
      spike,
      fetchedAt: new Date().toISOString(),
    };
    cache = { ts: Date.now(), payload };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
