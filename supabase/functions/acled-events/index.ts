const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('ACLED_API_KEY');
  const email = Deno.env.get('ACLED_EMAIL');
  if (!apiKey || !email) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const from = url.searchParams.get('from') || fmt(weekAgo);
    const to = url.searchParams.get('to') || fmt(today);

    const upstream = `https://api.acleddata.com/acled/read?key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&limit=0&event_date=${encodeURIComponent(from)}|${encodeURIComponent(to)}&event_date_where=BETWEEN`;
    const res = await fetch(upstream);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'upstream_failed', status: res.status }), {
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
    return new Response(JSON.stringify({ error: 'internal_error', message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
