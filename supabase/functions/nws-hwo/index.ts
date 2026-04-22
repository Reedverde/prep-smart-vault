const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'PrepPi (situational-awareness-app)';
const cache = new Map<string, { ts: number; payload: any }>();
const CACHE_MS = 30 * 60 * 1000;

const classifyRisk = (text: string): 'clear' | 'watch' | 'elevated' | 'high' => {
  const t = (text || '').toLowerCase();
  if (/no hazardous weather/.test(t)) return 'clear';
  if (/tornado|damaging/.test(t)) return 'high';
  if (/severe/.test(t)) return 'elevated';
  if (/thunderstorm|wind/.test(t)) return 'watch';
  return 'clear';
};

const cleanText = (t: string) =>
  t.replace(/\$\$/g, '').replace(/&&/g, '').replace(/\s+/g, ' ').trim();

const truncateWord = (s: string, max: number) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf(' ');
  return (i > max * 0.6 ? cut.slice(0, i) : cut) + '…';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: 'bad_coords' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_MS) {
      return new Response(JSON.stringify(hit.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = { 'User-Agent': UA, Accept: 'application/geo+json' };

    const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lng}`, { headers });
    if (!pointRes.ok) throw new Error(`points ${pointRes.status}`);
    const point = await pointRes.json();
    const office: string = point?.properties?.cwa || point?.properties?.gridId;
    if (!office) throw new Error('no_office');

    const listRes = await fetch(`https://api.weather.gov/products/types/HWO/locations/${office}`, {
      headers: { 'User-Agent': UA, Accept: 'application/ld+json' },
    });
    if (!listRes.ok) throw new Error(`hwo_list ${listRes.status}`);
    const list = await listRes.json();
    const productId = list?.['@graph']?.[0]?.id || list?.products?.[0]?.id;
    const issuedAt = list?.['@graph']?.[0]?.issuanceTime || list?.products?.[0]?.issuanceTime || null;

    let dayOneText = '';
    let extended = '';
    let spotter = '';
    let productUrl = `https://forecast.weather.gov/product.php?site=NWS&product=HWO&issuedby=${office}`;

    if (productId) {
      const prodRes = await fetch(`https://api.weather.gov/products/${productId}`, {
        headers: { 'User-Agent': UA, Accept: 'application/ld+json' },
      });
      if (prodRes.ok) {
        const prod = await prodRes.json();
        const text: string = prod?.productText || '';
        productUrl = prod?.['@id'] || productUrl;

        // Split on standard HWO sections
        const dayOneMatch = text.match(/\.DAY ONE\.\.\.([\s\S]*?)(?=\.DAYS TWO|\.SPOTTER|$)/i);
        const extMatch = text.match(/\.DAYS TWO THROUGH SEVEN\.\.\.([\s\S]*?)(?=\.SPOTTER|$)/i);
        const spotMatch = text.match(/\.SPOTTER INFORMATION STATEMENT\.\.\.([\s\S]*?)(?=\$\$|$)/i);

        dayOneText = dayOneMatch ? cleanText(dayOneMatch[1]) : '';
        extended = extMatch ? truncateWord(cleanText(extMatch[1]), 500) : '';
        spotter = spotMatch ? cleanText(spotMatch[1]) : '';
      }
    }

    const payload = {
      office,
      issuedAt,
      dayOne: { risk: classifyRisk(dayOneText), text: truncateWord(dayOneText, 300) },
      extended,
      spotter,
      spotterActivated: spotter && !/not (being )?activated|not requested/i.test(spotter),
      productUrl,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(key, { ts: Date.now(), payload });
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'internal_error', message: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
