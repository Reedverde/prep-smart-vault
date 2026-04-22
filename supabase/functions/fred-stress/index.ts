import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 60 * 60 * 1000;

const fetchFred = async (apiKey: string, seriesId: string, limit: number) => {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fred ${seriesId} ${res.status}`);
  const json = await res.json();
  return (json?.observations || [])
    .map((o: any) => ({ date: o.date, value: o.value === '.' ? null : Number(o.value) }))
    .filter((o: any) => o.value == null || Number.isFinite(o.value));
};

const stressLevel = (v: number): 'low' | 'below' | 'normal' | 'elevated' | 'high' => {
  if (v < -1) return 'low';
  if (v < 0) return 'below';
  if (v < 1) return 'normal';
  if (v < 2) return 'elevated';
  return 'high';
};

const latestValid = (rows: any[]) => rows.find((r) => r.value != null) || null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const apiKey = Deno.env.get('FRED_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ notConfigured: true, key: 'FRED_API_KEY' }), {
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
    const [stlfsiRows, vixRows, yieldRows, mortgageRows] = await Promise.all([
      fetchFred(apiKey, 'STLFSI4', 60),
      fetchFred(apiKey, 'VIXCLS', 5),
      fetchFred(apiKey, 'T10Y2Y', 5),
      fetchFred(apiKey, 'MORTGAGE30US', 5),
    ]);

    const stlfsiLatest = latestValid(stlfsiRows);
    const stlfsiAsc = [...stlfsiRows].reverse().filter((r) => r.value != null).slice(-52);
    const vix = latestValid(vixRows);
    const yieldCurve = latestValid(yieldRows);
    const mortgage = latestValid(mortgageRows);

    const payload = {
      stlfsi: stlfsiLatest
        ? {
            latest: stlfsiLatest.value,
            date: stlfsiLatest.date,
            level: stressLevel(stlfsiLatest.value),
            series: stlfsiAsc,
          }
        : null,
      vix: vix ? { value: vix.value, date: vix.date } : null,
      yieldCurve: yieldCurve ? { value: yieldCurve.value, date: yieldCurve.date } : null,
      mortgage30: mortgage ? { value: mortgage.value, date: mortgage.date } : null,
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
    console.error('fred-stress error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
