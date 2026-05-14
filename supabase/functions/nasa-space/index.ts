import { corsHeaders, requireUser } from '../_shared/auth.ts';
import { cacheRead, cacheWrite } from '../_shared/cache.ts';

const CACHE_KEY = 'nasa:space';
const FRESH_MS = 3 * 60 * 60 * 1000;          // 3h — NASA data evolves slowly
const STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000; // 7d fallback

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const apiKey = Deno.env.get('NASA_API_KEY');
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
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const startDate = fmt(weekAgo);
    const endDate = fmt(today);

    const [flaresRes, cmesRes, neoRes] = await Promise.all([
      fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`),
      fetch(`https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=${apiKey}`),
      fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`),
    ]);

    const flares = flaresRes.ok ? await flaresRes.json() : [];
    const cmes = cmesRes.ok ? await cmesRes.json() : [];
    const neoJson = neoRes.ok ? await neoRes.json() : { near_earth_objects: {} };

    const neoList: any[] = [];
    const byDate = neoJson.near_earth_objects || {};
    for (const date of Object.keys(byDate)) {
      for (const neo of byDate[date]) {
        const ca = neo.close_approach_data?.[0];
        if (!ca) continue;
        neoList.push({
          id: neo.id,
          name: neo.name,
          date: ca.close_approach_date_full || ca.close_approach_date,
          missKm: parseFloat(ca.miss_distance?.kilometers || '0'),
          missLd: parseFloat(ca.miss_distance?.lunar || '0'),
          velocityKmS: parseFloat(ca.relative_velocity?.kilometers_per_second || '0'),
          diameterM: neo.estimated_diameter?.meters?.estimated_diameter_max || 0,
          hazardous: neo.is_potentially_hazardous_asteroid,
        });
      }
    }
    neoList.sort((a, b) => a.missKm - b.missKm);

    const payload = {
      donki: {
        flares: Array.isArray(flares) ? flares.map((f: any) => ({
          id: f.flrID,
          classType: f.classType,
          beginTime: f.beginTime,
          peakTime: f.peakTime,
          sourceLocation: f.sourceLocation,
        })) : [],
        cmes: Array.isArray(cmes) ? cmes.map((c: any) => ({
          id: c.activityID,
          startTime: c.startTime,
          note: c.note,
        })) : [],
      },
      neo: neoList.slice(0, 20),
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
    console.error('nasa-space error:', err);
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
