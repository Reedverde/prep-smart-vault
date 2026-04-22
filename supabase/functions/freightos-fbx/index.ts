import { corsHeaders, requireUser } from '../_shared/auth.ts';

let cache: { ts: number; payload: any } | null = null;
const CACHE_MS = 60 * 60 * 1000;

type Row = { period: string; value: number };

const ENDPOINTS = [
  'https://fbx.freightos.com/api/weekly-rates.json',
  'https://fbx.freightos.com/api/index/global',
  'https://terminal49.com/freightos-baltic-index/data.json',
];

const computeStats = (rowsAsc: Row[], unit: string) => {
  if (!rowsAsc.length) return null;
  const desc = [...rowsAsc].reverse();
  const ascSeries = rowsAsc.slice(-12);
  const latest = desc[0]?.value ?? null;
  const prior = desc[1]?.value ?? null;
  const fourBack = desc[3]?.value ?? null;
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
    latestPeriod: desc[0]?.period ?? null,
    unit,
  };
};

// Defensive parser: try several known shapes
const tryParse = (raw: any): Row[] | null => {
  if (!raw) return null;
  // Shape 1: { data: [{date, price}] } or { series: [...] }
  const candidates: any[] = [];
  if (Array.isArray(raw)) candidates.push(raw);
  if (Array.isArray(raw?.data)) candidates.push(raw.data);
  if (Array.isArray(raw?.series)) candidates.push(raw.series);
  if (Array.isArray(raw?.rates)) candidates.push(raw.rates);
  if (Array.isArray(raw?.points)) candidates.push(raw.points);

  for (const arr of candidates) {
    const rows: Row[] = arr
      .map((r: any) => {
        const period = r?.date || r?.period || r?.timestamp || r?.week || r?.t || null;
        const value = Number(r?.price ?? r?.value ?? r?.index ?? r?.rate ?? r?.v);
        if (!period || !Number.isFinite(value)) return null;
        return { period: String(period), value };
      })
      .filter((r: Row | null): r is Row => r !== null);
    if (rows.length >= 2) {
      // Sort asc
      rows.sort((a, b) => (a.period < b.period ? -1 : 1));
      return rows;
    }
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  if (cache && Date.now() - cache.ts < CACHE_MS) {
    return new Response(JSON.stringify(cache.payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const attempted: string[] = [];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (PrepPi situational-awareness)',
    Accept: 'application/json,text/plain,*/*',
  };

  for (const url of ENDPOINTS) {
    attempted.push(url);
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.warn(`freightos-fbx ${url} -> ${res.status}`);
        continue;
      }
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        console.warn(`freightos-fbx ${url} not JSON, first 300:`, text.slice(0, 300));
        continue;
      }
      const rows = tryParse(json);
      if (!rows) {
        console.warn(`freightos-fbx ${url} unparseable shape, keys:`, Object.keys(json || {}).slice(0, 10));
        continue;
      }
      const stats = computeStats(rows, 'index');
      if (!stats) continue;
      const payload = { global: stats, fetchedAt: new Date().toISOString() };
      cache = { ts: Date.now(), payload };
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn(`freightos-fbx ${url} threw:`, err);
    }
  }

  // All attempts failed — do not cache.
  const payload = {
    status: 'unavailable',
    message: 'FBX public feed not found',
    attempted,
    fetchedAt: new Date().toISOString(),
  };
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
