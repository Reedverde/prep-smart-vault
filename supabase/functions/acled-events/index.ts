const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAcledToken(email: string, password: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  const body = new URLSearchParams({
    username: email,
    password,
    grant_type: 'password',
    client_id: 'acled',
  });
  const res = await fetch('https://acleddata.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`acled_oauth_failed:${res.status}`);
  }
  const json = await res.json();
  const token = json.access_token as string;
  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 1800;
  cachedToken = {
    token,
    // refresh 5 min early
    expiresAt: Date.now() + (expiresIn - 300) * 1000,
  };
  return token;
}

async function fetchAcled(token: string, from: string, to: string) {
  const url = `https://acleddata.com/api/acled/read?limit=0&event_date=${encodeURIComponent(from)}|${encodeURIComponent(to)}&event_date_where=BETWEEN`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const email = Deno.env.get('ACLED_EMAIL');
  const password = Deno.env.get('ACLED_PASSWORD');
  if (!email || !password) {
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

    let token = await getAcledToken(email, password);
    let res = await fetchAcled(token, from, to);
    if (res.status === 401) {
      cachedToken = null;
      token = await getAcledToken(email, password);
      res = await fetchAcled(token, from, to);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return new Response(
        JSON.stringify({
          error: 'upstream_failed',
          status: res.status,
          hint:
            res.status === 403
              ? 'ACLED account lacks API data access. Verify the account at https://acleddata.com/register-for-access has API access enabled.'
              : undefined,
          upstream: body.slice(0, 200),
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    const json = await res.json();
    const events: any[] = Array.isArray(json?.data) ? json.data : [];

    const byRegion: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const ev of events) {
      const region = ev.region || 'Unknown';
      const type = ev.event_type || 'Unknown';
      byRegion[region] = (byRegion[region] || 0) + 1;
      byType[type] = (byType[type] || 0) + 1;
    }

    return new Response(
      JSON.stringify({
        count: events.length,
        byRegion,
        byType,
        from,
        to,
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
