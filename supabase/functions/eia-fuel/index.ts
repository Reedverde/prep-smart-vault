import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 60 * 60 * 1000;

type Row = { period: string; value: number };

const fetchSeries = async (apiKey: string, route: string, seriesId: string, length = 16) => {
  const url = `https://api.eia.gov/v2/${route}/?frequency=weekly&data[0]=value&facets[series][]=${seriesId}&sort[0][column]=period&sort[0][direction]=desc&length=${length}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`eia ${seriesId} ${res.status}`);
  const json = await res.json();
  const rows: Row[] = (json?.response?.data || [])
    .map((r: any) => ({ period: r.period, value: Number(r.value) }))
    .filter((r: Row) => Number.isFinite(r.value));
  return rows; // desc
};

const fetchHenryHubDaily = async (apiKey: string) => {
  // Henry Hub natural gas spot price (daily). Aggregate to weekly (last value per ISO week).
  const url = `https://api.eia.gov/v2/natural-gas/pri/fut/data/?frequency=daily&data[0]=value&facets[series][]=RNGWHHD&sort[0][column]=period&sort[0][direction]=desc&length=120&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`eia RNGWHHD ${res.status}`);
  const json = await res.json();
  const daily: Row[] = (json?.response?.data || [])
    .map((r: any) => ({ period: r.period, value: Number(r.value) }))
    .filter((r: Row) => Number.isFinite(r.value));
  // daily is desc by period. Group by ISO week, take latest (max period) per week.
  const byWeek = new Map<string, Row>();
  for (const r of daily) {
    const d = new Date(r.period + 'T00:00:00Z');
    // ISO week key: yyyy-Www
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    const existing = byWeek.get(key);
    if (!existing || r.period > existing.period) {
      byWeek.set(key, { period: r.period, value: r.value });
    }
  }
  // Convert to desc-sorted array of weekly points
  const weekly = Array.from(byWeek.values()).sort((a, b) => (a.period < b.period ? 1 : -1));
  return weekly;
};

const computeStats = (rowsDesc: Row[], unit: string) => {
  if (!rowsDesc.length) return null;
  const ascSeries = [...rowsDesc].slice(0, 12).reverse();
  const latest = rowsDesc[0]?.value ?? null;
  const prior = rowsDesc[1]?.value ?? null;
  const fourBack = rowsDesc[3]?.value ?? null;
  const wow = latest != null && prior != null ? latest - prior : null;
  const wowPct = latest != null && prior != null && prior !== 0 ? ((latest - prior) / prior) * 100 : null;
  const fourWeekPct = latest != null && fourBack != null && fourBack !== 0
    ? ((latest - fourBack) / fourBack) * 100
    : null;
  const spike =
    (wowPct != null && Math.abs(wowPct) > 5) ||
    (fourWeekPct != null && Math.abs(fourWeekPct) > 10);
  return {
    latest,
    prior,
    wow,
    wowPct,
    fourWeekPct,
    spike,
    series: ascSeries,
    latestPeriod: rowsDesc[0]?.period ?? null,
    unit,
  };
};

const safe = async <T>(fn: () => Promise<T>, label: string): Promise<T | null> => {
  try {
    return await fn();
  } catch (err) {
    console.error(`eia-fuel ${label}:`, err);
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const apiKey = Deno.env.get('EIA_APP_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ notConfigured: true, key: 'EIA_APP_KEY' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  }

  try {
    const [gasolineRows, dieselRows, heatingOilRows, natGasWeekly, nationalRows] = await Promise.all([
      safe(() => fetchSeries(apiKey, 'petroleum/pri/gnd/data', 'EMM_EPMR_PTE_R10_DPG'), 'gasoline'),
      safe(() => fetchSeries(apiKey, 'petroleum/pri/gnd/data', 'EMD_EPD2D_PTE_R10_DPG'), 'diesel'),
      safe(() => fetchSeries(apiKey, 'petroleum/pri/wfr/data', 'W_EPD2F_PRS_R10_DPG'), 'heatingOil'),
      safe(() => fetchHenryHubDaily(apiKey), 'naturalGas'),
      safe(() => fetchSeries(apiKey, 'petroleum/pri/gnd/data', 'EMM_EPMR_PTE_NUS_DPG'), 'nationalGas'),
    ]);

    const payload = {
      gasoline: gasolineRows ? computeStats(gasolineRows, 'USD/gal') : null,
      diesel: dieselRows ? computeStats(dieselRows, 'USD/gal') : null,
      naturalGas: natGasWeekly ? computeStats(natGasWeekly, 'USD/MMBtu') : null,
      heatingOil: heatingOilRows ? computeStats(heatingOilRows, 'USD/gal') : null,
      nationalGas: nationalRows && nationalRows[0]
        ? { latest: nationalRows[0].value, latestPeriod: nationalRows[0].period }
        : null,
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: Date.now(), payload };
    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
      },
    });
  } catch (err) {
    console.error('eia-fuel error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
