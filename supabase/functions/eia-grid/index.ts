import { corsHeaders, requireUser } from '../_shared/auth.ts';
import { cacheRead, cacheWrite } from '../_shared/cache.ts';

// EIA API v2: region PJM demand + generation mix
// Docs: https://www.eia.gov/opendata/documentation.php
const CACHE_KEY = 'eia:grid:pjm';
const FRESH_MS = 60 * 60 * 1000;              // 1h — EIA hourly data
const STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000; // 7d fallback

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const apiKey = Deno.env.get('EIA_APP_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const forceFresh = new URL(req.url).searchParams.get('fresh') === '1';
  if (!forceFresh) {
    const cached = await cacheRead(CACHE_KEY);
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < FRESH_MS) {
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'cache-fresh', 'X-Cache-Fetched-At': cached.fetched_at },
      });
    }
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

    // Generation mix by fuel — widened to 7 days. EIA fuel-type-data publishes with a
    // multi-hour (sometimes >24h) delay; we still take only the latest period found.
    const mixUrl = `https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=${apiKey}&frequency=hourly&data[0]=value&facets[respondent][]=PJM&start=${fmtHour(weekAgo)}&end=${fmtHour(now)}&sort[0][column]=period&sort[0][direction]=desc&length=500`;

    const [demandRes, peakRes, mixRes] = await Promise.all([
      fetch(demandUrl),
      fetch(peakUrl),
      fetch(mixUrl),
    ]);

    if (!demandRes.ok || !mixRes.ok) {
      const demandBody = !demandRes.ok ? await demandRes.text().catch(() => '') : '';
      const mixBody = !mixRes.ok ? await mixRes.text().catch(() => '') : '';
      const isInvalidKey =
        demandBody.includes('API_KEY_INVALID') || mixBody.includes('API_KEY_INVALID');
      console.error('eia-grid upstream failed', {
        demand: demandRes.status,
        mix: mixRes.status,
        isInvalidKey,
      });
      const cached = await cacheRead(CACHE_KEY);
      if (cached && Date.now() - new Date(cached.fetched_at).getTime() < STALE_MAX_MS) {
        return new Response(JSON.stringify(cached.payload), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'cache-stale', 'X-Cache-Fetched-At': cached.fetched_at },
        });
      }
      return new Response(
        JSON.stringify({ error: isInvalidKey ? 'invalid_api_key' : 'upstream_failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const demandJson = await demandRes.json();
    const peakJson = peakRes.ok ? await peakRes.json() : { response: { data: [] } };
    const mixJson = await mixRes.json();

    const demandSeries: Array<{ time: string; mw: number }> = (demandJson?.response?.data || [])
      .map((r: any) => ({ time: r.period, mw: Number(r.value) }))
      .filter((r: any) => Number.isFinite(r.mw));

    const currentDemand = demandSeries.length ? demandSeries[demandSeries.length - 1].mw : null;
    const peak7d = peakJson?.response?.data?.[0]?.value ? Number(peakJson.response.data[0].value) : null;

    // Today's peak (UTC day) from the 24h demand series — observed-so-far if intraday.
    const todayUtc = new Date().toISOString().slice(0, 10);
    const todaySeries = demandSeries.filter((d) => (d.time || '').slice(0, 10) === todayUtc);
    const peakToday = todaySeries.length ? Math.max(...todaySeries.map((d) => d.mw)) : null;

    // Stress level: current vs today's peak (or 7d peak as fallback)
    const stressBaseline = peakToday ?? peak7d;
    let stressLevel: 'normal' | 'elevated' | 'stressed' | 'critical' = 'normal';
    let stressPct: number | null = null;
    if (currentDemand && stressBaseline) {
      stressPct = (currentDemand / stressBaseline) * 100;
      if (stressPct >= 95) stressLevel = 'critical';
      else if (stressPct >= 90) stressLevel = 'stressed';
      else if (stressPct >= 80) stressLevel = 'elevated';
      else stressLevel = 'normal';
    }

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

    console.log('eia-grid: mix debug', {
      mixRowsTotal: mixRows.length,
      latestPeriod,
      mixLatestRows: mixLatest.length,
      fuels: Object.keys(mix),
      mixTotal,
    });

    const payload = {
      region: 'PJM',
      currentDemand,
      peakToday,
      peak7d,
      stressLevel,
      stressPct,
      // Back-compat
      peakDemand7d: peak7d,
      highLoad: stressLevel === 'stressed' || stressLevel === 'critical',
      demandTrend: demandSeries,
      mix,
      mixTotal,
      mixPeriod: latestPeriod,
    };

    await cacheWrite(CACHE_KEY, payload);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'fresh',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  } catch (err) {
    console.error('eia-grid error:', err);
    const cached = await cacheRead(CACHE_KEY);
    if (cached && Date.now() - new Date(cached.fetched_at).getTime() < STALE_MAX_MS) {
      return new Response(JSON.stringify(cached.payload), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'cache-stale', 'X-Cache-Fetched-At': cached.fetched_at },
      });
    }
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
