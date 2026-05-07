import { corsHeaders, requireUser } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const apiKey = Deno.env.get('AIRNOW_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const distance = url.searchParams.get('distance') || '25';

    if (!lat || !lng || !Number.isFinite(parseFloat(lat)) || !Number.isFinite(parseFloat(lng))) {
      return new Response(JSON.stringify({ error: 'invalid_coordinates' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstream = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&distance=${encodeURIComponent(distance)}&API_KEY=${encodeURIComponent(apiKey)}`;

    // AirNow occasionally returns transient errors; retry up to 3 times with backoff.
    let res: Response | null = null;
    let lastStatus = 0;
    let lastBody = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(upstream, { signal: ctrl.signal });
        clearTimeout(t);
        if (r.ok) {
          res = r;
          break;
        }
        lastStatus = r.status;
        lastBody = (await r.text()).slice(0, 200);
        console.warn(`airnow-observations upstream ${r.status} (attempt ${attempt + 1}): ${lastBody}`);
      } catch (e) {
        console.warn(`airnow-observations fetch threw (attempt ${attempt + 1}):`, e);
      }
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    if (!res) {
      return new Response(JSON.stringify({ error: 'upstream_failed', status: lastStatus, detail: lastBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('airnow-observations error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
