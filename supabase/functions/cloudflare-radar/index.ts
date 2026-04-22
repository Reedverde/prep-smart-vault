import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 15 * 60 * 1000;

const cfFetch = async (token: string, path: string) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`cf ${res.status} ${path} ${body.slice(0, 200)}`);
  }
  return await res.json();
};

const computeTrafficDelta = (timeseries: any): number | null => {
  const series: number[] =
    timeseries?.main?.values?.requests?.map((v: any) => Number(v)) ??
    timeseries?.main?.values?.bytes?.map((v: any) => Number(v)) ??
    timeseries?.serie_0?.values?.map((v: any) => Number(v)) ??
    [];
  const clean = series.filter((v) => Number.isFinite(v));
  if (clean.length < 4) return null;
  const recent = clean.slice(-Math.min(24, Math.floor(clean.length / 4)));
  const baseline = clean.slice(0, clean.length - recent.length);
  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const r = avg(recent);
  const b = avg(baseline);
  if (!b) return null;
  return ((r - b) / b) * 100;
};

const classifyAttacks = (summary: any): 'low' | 'medium' | 'high' => {
  const total = Number(summary?.summary_0?.total ?? summary?.attacks?.total ?? 0);
  if (!Number.isFinite(total) || total < 100) return 'low';
  if (total < 1000) return 'medium';
  return 'high';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const token = Deno.env.get('CLOUDFLARE_RADAR_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ notConfigured: true, key: 'CLOUDFLARE_RADAR_API_TOKEN' }), {
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
    const [traffic, attacks, targets] = await Promise.all([
      cfFetch(token, '/radar/http/timeseries?dateRange=7d&location=US').catch((e) => {
        console.error('cloudflare-radar traffic fetch failed:', e);
        return { error: true } as any;
      }),
      cfFetch(token, '/radar/attacks/layer7/summary?dateRange=1d&location=US').catch((e) => {
        console.error('cloudflare-radar attacks fetch failed:', e);
        return { error: true } as any;
      }),
      cfFetch(token, '/radar/attacks/layer7/top/locations/target?dateRange=7d&limit=5').catch((e) => {
        console.error('cloudflare-radar targets fetch failed:', e);
        return { error: true } as any;
      }),
    ]);

    const trafficDeltaPct = traffic?.result ? computeTrafficDelta(traffic.result) : null;
    const attackLevel = attacks?.result ? classifyAttacks(attacks.result) : 'low';
    const topTargets: Array<{ name: string; value: number }> = (targets?.result?.top_0 || targets?.result?.top || [])
      .map((t: any) => ({
        name: t?.originCountryAlpha2 || t?.targetCountryName || t?.name || t?.location || '—',
        value: Number(t?.value ?? t?.rank ?? 0),
      }))
      .slice(0, 5);

    let anomalyNote: string | null = null;
    if (trafficDeltaPct != null && Math.abs(trafficDeltaPct) > 15) {
      anomalyNote = `US traffic ${trafficDeltaPct > 0 ? 'spiked' : 'dropped'} ${trafficDeltaPct.toFixed(0)}% vs baseline`;
    }
    if (attackLevel === 'high') {
      anomalyNote = (anomalyNote ? anomalyNote + ' · ' : '') + 'Layer 7 attack volume elevated';
    }

    const payload = {
      trafficDeltaPct,
      attackLevel,
      topTargets,
      anomalyNote,
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
    console.error('cloudflare-radar error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
