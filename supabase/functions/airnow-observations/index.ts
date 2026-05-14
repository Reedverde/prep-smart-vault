import { corsHeaders, requireUser } from '../_shared/auth.ts';
import { serveCached, cacheHeaders } from '../_shared/cache.ts';

const FRESH_MS = 60 * 60 * 1000;          // 1h — AirNow updates hourly
const STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000; // 7d fallback when upstream is down

const fetchAirNow = async (apiKey: string, lat: string, lng: string, distance: string) => {
  const upstream = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&distance=${encodeURIComponent(distance)}&API_KEY=${encodeURIComponent(apiKey)}`;

  let lastErr = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(upstream, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'PrepPi/1.0', Accept: 'application/json' },
      });
      clearTimeout(t);
      if (r.ok) return await r.json();
      lastErr = `status ${r.status}`;
      console.warn(`airnow upstream ${r.status} (attempt ${attempt + 1})`);
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      console.warn(`airnow fetch threw (attempt ${attempt + 1}):`, lastErr);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`airnow upstream failed: ${lastErr}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth removed: this endpoint proxies public data; cron jobs need keyless access.

  const apiKey = Deno.env.get('AIRNOW_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');
  const distance = url.searchParams.get('distance') || '25';
  const forceFresh = url.searchParams.get('fresh') === '1';

  if (!lat || !lng || !Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lng))) {
    return new Response(JSON.stringify({ error: 'invalid_coordinates' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Round coords to 2 decimals (~1km) so nearby requests share a cache row.
  const cacheKey = `airnow:${parseFloat(lat).toFixed(2)},${parseFloat(lng).toFixed(2)},${distance}`;

  try {
    const result = await serveCached({
      key: cacheKey,
      freshMs: FRESH_MS,
      staleMaxAgeMs: STALE_MAX_MS,
      forceFresh,
      fetcher: () => fetchAirNow(apiKey, lat, lng, distance),
    });
    return new Response(JSON.stringify(result.payload), {
      status: 200,
      headers: { ...corsHeaders, ...cacheHeaders(result), 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.warn('airnow-observations no cache + upstream failed:', err);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { ...corsHeaders, 'X-Cache': 'empty', 'Content-Type': 'application/json' },
    });
  }
});
