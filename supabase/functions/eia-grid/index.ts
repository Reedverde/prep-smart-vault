const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EIA API v2: region PJM demand + generation mix
// Docs: https://www.eia.gov/opendata/documentation.php

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('EIA_APP_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const fmtHour = (d: Date) => d.toISOString().slice(0, 13); // YYYY-MM-DDTHH

    // Demand trend (hourly) — last 24h
    const demandUrl = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${apiKey}&frequency=hourly&data[0]=value&facets[respondent][]=PJM&facets[type][]=D&start=${fmtHour(dayAgo)}&end=${fmtHour(now)}&sort[0][column]=period&sort[0][direction]=asc`;

    // 7-day peak demand (for high-load flag)
    const peakUrl = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${apiKey}&frequency=hourly&data[0]=value&facets[respondent][]=PJM&facets[type][]=D&start=${fmtHour(weekAgo)}&end=${fmtHour(now)}&sort[0][column]=value&sort[0][direction]=desc&length=1`;

    // Generation mix by fuel (latest hour)
    const mixUrl = `https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=${apiKey}&frequency=hourly&data[0]=value&facets[respondent][]=PJM&start=${fmtHour(dayAgo)}&end=${fmtHour(now)}&sort[0][column]=period&sort[0][direction]=desc&length=100`;

    const [demandRes, peakRes, mixRes] = await Promise.all([
      fetch(demandUrl),
      fetch(peakUrl),
      fetch(mixUrl),
    ]);

    if (!demandRes.ok || !mixRes.ok) {
      return new Response(JSON.stringify({ error: 'upstream_failed', demand: demandRes.status, mix: mixRes.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const demandJson = await demandRes.json();
    const peakJson = peakRes.ok ? await peakRes.json() : { response: { data: [] } };
    const mixJson = await mixRes.json();

    const demandSeries: Array<{ time: string; mw: number }> = (demandJson?.response?.data || [])
      .map((r: any) => ({ time: r.period, mw: Number(r.value) }))
      .filter((r: any) => Number.isFinite(r.mw));

    const currentDemand = demandSeries.length ? demandSeries[demandSeries.length - 1].mw : null;
    const peakDemand = peakJson?.response?.data?.[0]?.value ? Number(peakJson.response.data[0].value) : null;

    // Group mix by most-recent period
    const mixRows: any[] = mixJson?.response?.data || [];
    let latestPeriod: string | null = null;
    for (const r of mixRows) {
      if (!latestPeriod || r.period > latestPeriod) latestPeriod = r.period;
    }
    const mixLatest = mixRows.filter((r) => r.period === latestPeriod);
    const mix: Record<string, number> = {};
    for (const r of mixLatest) {
      const fuel = r['type-name'] || r.fueltype || 'Other';
      mix[fuel] = (mix[fuel] || 0) + Number(r.value || 0);
    }
    const mixTotal = Object.values(mix).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({
        region: 'PJM',
        currentDemand,
        peakDemand7d: peakDemand,
        highLoad: currentDemand && peakDemand ? currentDemand >= peakDemand * 0.95 : false,
        demandTrend: demandSeries,
        mix,
        mixTotal,
        mixPeriod: latestPeriod,
      }),
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
