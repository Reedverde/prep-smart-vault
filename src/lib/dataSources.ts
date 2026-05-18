// Pure data fetchers — no React, no React Query. Single source of truth for
// every upstream URL, header, edge-function name, and response shape used by
// the dashboard. Consumed by both `useDataSources.ts` (React Query wrappers,
// used by /pi and the main dashboard) and by /pi3's coordinated 60s loop.
//
// Any change to URLs, edge functions, or parsing must happen here so both
// routes stay in sync.

import { supabase } from "@/integrations/supabase/client";

// NWS requires a User-Agent that identifies the app + contact. Missing the
// contact form is a known cause of intermittent 403s.
const UA = "PrepPi situational-awareness (contact: support@everde.co)";
const nwsHeaders = { "User-Agent": UA, Accept: "application/geo+json" };

// Default per-request timeout — bumped to 45s so Pi 3 b/g WiFi + cold edge
// function starts have headroom. Tiles still surface failure (vs. hanging
// forever) but won't false-fail under normal slow conditions.
const FETCH_TIMEOUT_MS = 45_000;

// One soft retry for transient network failures (AbortError, "Failed to fetch").
// Does NOT retry HTTP error statuses — those are real, not noise.
export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const once = async (): Promise<Response> => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(input, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    return await once();
  } catch (e: any) {
    const transient =
      e?.name === "AbortError" ||
      (typeof e?.message === "string" && /failed to fetch|network/i.test(e.message));
    if (!transient) throw e;
    await new Promise((r) => setTimeout(r, 1500));
    return await once();
  }
};

// Sends the authenticated user's session JWT so the function's requireUser() check passes.
export const edgeHeaders = async (): Promise<HeadersInit> => {
  const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? anonKey;
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  };
};

const cToF = (c: number | null | undefined) =>
  c == null || !Number.isFinite(c) ? null : (c * 9) / 5 + 32;

const tryStationObs = async (stationId: string) => {
  const res = await fetchWithTimeout(
    `https://api.weather.gov/stations/${stationId}/observations/latest`,
    { headers: nwsHeaders },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const p = json?.properties;
  if (!p) return null;
  const tempC = p.temperature?.value ?? null;
  const ts = p.timestamp ? new Date(p.timestamp) : null;
  if (!ts || Date.now() - ts.getTime() > 3 * 60 * 60 * 1000) {
    if (tempC == null) return null;
  }
  return {
    temperatureC: tempC,
    temperatureF: cToF(tempC),
    humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
    dewpointC: p.dewpoint?.value ?? null,
    dewpointF: cToF(p.dewpoint?.value),
    windSpeedKph: p.windSpeed?.value ?? null,
    windSpeedUnit: p.windSpeed?.unitCode ?? null,
    windDirectionDeg: p.windDirection?.value ?? null,
    shortForecast: p.textDescription || null,
    timestamp: p.timestamp || null,
    stationName: json?.properties?.station || stationId,
    stationId,
  };
};

// ============ NWS WEATHER ============
export const fetchWeather = async (lat: number, lng: number) => {
  const pointRes = await fetchWithTimeout(`https://api.weather.gov/points/${lat},${lng}`, { headers: nwsHeaders });
  if (!pointRes.ok) throw new Error("NWS points failed");
  const point = await pointRes.json();

  const forecastUrl: string = point.properties.forecast;
  const hourlyUrl: string = point.properties.forecastHourly;
  const stationsUrl: string = point.properties.observationStations;

  const [fcRes, hourlyRes, stationsRes] = await Promise.all([
    fetchWithTimeout(forecastUrl, { headers: nwsHeaders }),
    hourlyUrl
      ? fetchWithTimeout(hourlyUrl, { headers: nwsHeaders }).catch(() => null)
      : Promise.resolve(null),
    stationsUrl
      ? fetchWithTimeout(stationsUrl, { headers: nwsHeaders }).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!fcRes.ok) throw new Error("NWS forecast failed");
  const fc = await fcRes.json();

  let hourlyPrecipChance: number | null = null;
  if (hourlyRes && (hourlyRes as Response).ok) {
    try {
      const hourly = await (hourlyRes as Response).json();
      const next = hourly?.properties?.periods?.[0];
      const pop = next?.probabilityOfPrecipitation?.value;
      if (pop != null) hourlyPrecipChance = Math.round(pop);
    } catch {
      /* ignore */
    }
  }

  let observed: Awaited<ReturnType<typeof tryStationObs>> | null = null;
  if (stationsRes && (stationsRes as Response).ok) {
    try {
      const stations = await (stationsRes as Response).json();
      const features = (stations?.features || []) as Array<any>;
      const ids = features
        .slice(0, 4)
        .map((f: any) => f?.properties?.stationIdentifier)
        .filter(Boolean);
      if (ids.length) {
        const settled = await Promise.allSettled(ids.map((id) => tryStationObs(id)));
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value && r.value.temperatureC != null) {
            observed = r.value;
            break;
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  return {
    observed,
    period: fc.properties.periods[0],
    nextPeriod: fc.properties.periods[1],
    upcoming: fc.properties.periods.slice(1, 5),
    hourlyPrecipChance,
    forecastUrl,
    stationsUrl,
  };
};

// ============ NWS LOCAL ALERTS (with 7-day history) ============
export const fetchLocalAlerts = async (lat: number, lng: number) => {
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetchWithTimeout(
    `https://api.weather.gov/alerts?point=${lat},${lng}&start=${start}`,
    { headers: nwsHeaders },
  );
  if (!res.ok) throw new Error("NWS alerts failed");
  const json = await res.json();
  const features = (json.features || []) as Array<any>;
  const now = new Date();
  const active = features.filter((f: any) => {
    const ends = f.properties?.ends;
    return !ends || new Date(ends) > now;
  });
  const allExpired = features
    .filter((f: any) => {
      const ends = f.properties?.ends;
      return ends && new Date(ends) <= now;
    })
    .sort((a: any, b: any) => new Date(b.properties.ends).getTime() - new Date(a.properties.ends).getTime());
  return {
    active,
    expired: allExpired.slice(0, 10),
    expiredTotal: allExpired.length,
  };
};

// ============ NWS NATIONAL ALERTS ============
export const fetchNationalAlerts = async () => {
  const res = await fetchWithTimeout(`https://api.weather.gov/alerts/active`, { headers: nwsHeaders });
  if (!res.ok) throw new Error("NWS national failed");
  const json = await res.json();
  return json.features as Array<any>;
};

// ============ USGS EARTHQUAKES ============
export const fetchEarthquakes = async () => {
  const res = await fetchWithTimeout(
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
  );
  if (!res.ok) throw new Error("USGS failed");
  const json = await res.json();
  return json.features as Array<any>;
};

// ============ NOAA SWPC Kp ============
export const fetchKpIndex = async () => {
  const res = await fetchWithTimeout(
    "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  );
  if (!res.ok) throw new Error("SWPC failed");
  const json = await res.json();
  const rows = (Array.isArray(json) ? json : [])
    .map((r: any) => {
      if (r && typeof r === "object" && !Array.isArray(r)) {
        const kp = Number(r.Kp ?? r.kp ?? r.kp_index);
        return { time: String(r.time_tag ?? r.time ?? ""), kp };
      }
      if (Array.isArray(r)) {
        const kp = Number(r[1]);
        return { time: String(r[0] ?? ""), kp };
      }
      return { time: "", kp: NaN };
    })
    .filter((r) => Number.isFinite(r.kp));
  return rows;
};

// ============ EPA AIRNOW (via edge proxy) ============
export const fetchAirQuality = async (lat: number, lng: number) => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/airnow-observations?lat=${lat}&lng=${lng}&distance=25`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (res.status === 503) {
    return { notConfigured: true } as any;
  }
  if (!res.ok) throw new Error("AirNow proxy failed");
  const json = await res.json();
  return json as Array<any>;
};

// ============ GDACS ============
export const fetchGdacs = async () => {
  const res = await fetchWithTimeout("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=&toDate=&alertlevel=Orange;Red&eventlist=EQ;TC;FL;VO;DR;WF");
  if (!res.ok) throw new Error("GDACS failed");
  const json = await res.json();
  const features = (json?.features || []).filter(
    (f: any) => String(f?.properties?.iscurrent).toLowerCase() === "true",
  );
  return features as Array<any>;
};

// ============ GDELT (via edge proxy, keyless) ============
export const fetchGdelt = async () => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/gdelt-events`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (!res.ok) throw new Error("GDELT proxy failed");
  const json = await res.json();
  return json as {
    count: number;
    byRegion: Record<string, number>;
    byType: Record<string, number>;
    from: string;
    to: string;
  };
};

// ============ NASA (via edge proxy) ============
export const fetchNasa = async () => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/nasa-space`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (res.status === 503) return { notConfigured: true } as any;
  if (!res.ok) throw new Error("NASA proxy failed");
  return await res.json();
};

// ============ EIA Grid (via edge proxy) ============
export const fetchEiaGrid = async () => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/eia-grid`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (res.status === 503) return { notConfigured: true } as any;
  if (!res.ok) throw new Error("EIA proxy failed");
  return await res.json();
};

// ============ GDELT Headlines (via edge proxy, keyless) ============
export const fetchGdeltHeadlines = async () => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/gdelt-headlines`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (!res.ok) throw new Error("GDELT headlines proxy failed");
  return await res.json() as {
    items: Array<{
      tag: string;
      title: string;
      url: string;
      country: string;
      domain: string;
      seendate: string;
    }>;
    fetchedAt: string;
  };
};

// ============ Phase 2 generic edge caller ============
export const callEdge = async (fn: string, qs = '') => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/${fn}${qs}`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (res.status === 503) return { notConfigured: true } as any;
  if (!res.ok) throw new Error(`${fn} proxy failed (${res.status})`);
  return await res.json();
};

export const fetchNwsHwo = (lat: number, lng: number) =>
  callEdge("nws-hwo", `?lat=${lat}&lng=${lng}`);

export const fetchEiaFuel = () => callEdge("eia-fuel");
export const fetchFreightosFbx = () => callEdge("freightos-fbx");
export const fetchFredStress = () => callEdge("fred-stress");
export const fetchPowerOutages = () => callEdge("power-outages");
export const fetchCloudflareRadar = () => callEdge("cloudflare-radar");

// ============ News Feed (DEPRECATED, kept for parity) ============
export const fetchNewsFeed = async (state: string | null) => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const qs = state ? `?state=${encodeURIComponent(state)}` : "";
  const url = `https://${projectId}.supabase.co/functions/v1/news-feed${qs}`;
  const res = await fetchWithTimeout(url, { headers: await edgeHeaders() });
  if (res.status === 503) return { notConfigured: true } as any;
  if (!res.ok) throw new Error("News proxy failed");
  return await res.json() as { items: Array<{ source: string; title: string; url: string; publishedAt: string; description?: string }> };
};
