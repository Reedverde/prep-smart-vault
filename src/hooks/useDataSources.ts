import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UA = "PrepPi (situational-awareness-app)";
const nwsHeaders = { "User-Agent": UA, Accept: "application/geo+json" };

// ============ Edge function helper ============
// Sends the authenticated user's session JWT so the function's requireUser() check passes.
// Throws when the user is not signed in — protected routes guarantee auth before queries run.
const edgeHeaders = async (): Promise<HeadersInit> => {
  const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? anonKey;
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  };
};


// ============ NWS WEATHER ============
const cToF = (c: number | null | undefined) =>
  c == null || !Number.isFinite(c) ? null : (c * 9) / 5 + 32;

const tryStationObs = async (stationId: string) => {
  const res = await fetch(
    `https://api.weather.gov/stations/${stationId}/observations/latest`,
    { headers: nwsHeaders },
  );
  if (!res.ok) return null;
  const json = await res.json();
  const p = json?.properties;
  if (!p) return null;
  const tempC = p.temperature?.value ?? null;
  // Stale if older than 3h
  const ts = p.timestamp ? new Date(p.timestamp) : null;
  if (!ts || Date.now() - ts.getTime() > 3 * 60 * 60 * 1000) {
    if (tempC == null) return null; // truly empty
  }
  return {
    temperatureC: tempC,
    temperatureF: cToF(tempC),
    humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
    dewpointC: p.dewpoint?.value ?? null,
    dewpointF: cToF(p.dewpoint?.value),
    windSpeedKph: p.windSpeed?.value ?? null, // m/s or km/h depending; NWS returns km/h with unitCode wmoUnit:km_h-1
    windSpeedUnit: p.windSpeed?.unitCode ?? null,
    windDirectionDeg: p.windDirection?.value ?? null,
    shortForecast: p.textDescription || null,
    timestamp: p.timestamp || null,
    stationName: json?.properties?.station || stationId,
    stationId,
  };
};

export const useWeather = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: async () => {
      const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lng}`, { headers: nwsHeaders });
      if (!pointRes.ok) throw new Error("NWS points failed");
      const point = await pointRes.json();

      const forecastUrl: string = point.properties.forecast;
      const hourlyUrl: string = point.properties.forecastHourly;
      const stationsUrl: string = point.properties.observationStations;

      // Fire forecast + hourly + stations list in parallel
      const [fcRes, hourlyRes, stationsRes] = await Promise.all([
        fetch(forecastUrl, { headers: nwsHeaders }),
        hourlyUrl
          ? fetch(hourlyUrl, { headers: nwsHeaders }).catch(() => null)
          : Promise.resolve(null),
        stationsUrl
          ? fetch(stationsUrl, { headers: nwsHeaders }).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!fcRes.ok) throw new Error("NWS forecast failed");
      const fc = await fcRes.json();

      // Hourly precip chance for next hour
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

      // Resolve nearest station observation, fallback up to 4 stations
      let observed: Awaited<ReturnType<typeof tryStationObs>> | null = null;
      if (stationsRes && (stationsRes as Response).ok) {
        try {
          const stations = await (stationsRes as Response).json();
          const features = (stations?.features || []) as Array<any>;
          for (const f of features.slice(0, 4)) {
            const id = f?.properties?.stationIdentifier;
            if (!id) continue;
            const obs = await tryStationObs(id);
            if (obs && obs.temperatureC != null) {
              observed = obs;
              break;
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
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

// ============ NWS LOCAL ALERTS (with 7-day history) ============
export const useLocalAlerts = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["alerts-local", lat, lng],
    queryFn: async () => {
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
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
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

// ============ NWS NATIONAL ALERTS ============
export const useNationalAlerts = (refreshMs: number) =>
  useQuery({
    queryKey: ["alerts-national"],
    queryFn: async () => {
      const res = await fetch(`https://api.weather.gov/alerts/active`, { headers: nwsHeaders });
      if (!res.ok) throw new Error("NWS national failed");
      const json = await res.json();
      return json.features as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
  });

// ============ USGS EARTHQUAKES ============
export const useEarthquakes = (refreshMs: number) =>
  useQuery({
    queryKey: ["earthquakes-week"],
    queryFn: async () => {
      const res = await fetch(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
      );
      if (!res.ok) throw new Error("USGS failed");
      const json = await res.json();
      return json.features as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
  });

// ============ NOAA SWPC Kp ============
export const useKpIndex = (refreshMs: number) =>
  useQuery({
    queryKey: ["kp-index"],
    queryFn: async () => {
      const res = await fetch(
        "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
      );
      if (!res.ok) throw new Error("SWPC failed");
      const json = (await res.json()) as Array<Array<any>>;
      const rows = json
        .slice(1)
        .filter((r) => r && r[1] !== null && r[1] !== undefined && r[1] !== "")
        .map((r) => ({
          time: r[0] as string,
          kp: Number(r[1]),
        }))
        .filter((r) => Number.isFinite(r.kp));
      return rows;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
  });

// ============ EPA AIRNOW (via edge proxy) ============
export const useAirQuality = (
  lat: number,
  lng: number,
  refreshMs: number,
) =>
  useQuery({
    queryKey: ["airnow", lat, lng],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/airnow-observations?lat=${lat}&lng=${lng}&distance=25`;
      const res = await fetch(url, { headers: await edgeHeaders() });
      if (res.status === 503) {
        return { notConfigured: true } as any;
      }
      if (!res.ok) throw new Error("AirNow proxy failed");
      const json = await res.json();
      return json as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("not_configured")) return false;
      return failureCount < 2;
    },
  });

// ============ GDACS ============
// Major disasters = currently-active GDACS events at Orange (humanitarian impact likely)
// or Red (severe humanitarian impact) alert level. Green excluded — minor events.
// iscurrent filter excludes events that have already ended.
export const useGdacs = (refreshMs: number) =>
  useQuery({
    queryKey: ["gdacs"],
    queryFn: async () => {
      const res = await fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=&toDate=&alertlevel=Orange;Red&eventlist=EQ;TC;FL;VO;DR;WF");
      if (!res.ok) throw new Error("GDACS failed");
      const json = await res.json();
      const features = (json?.features || []).filter(
        (f: any) => String(f?.properties?.iscurrent).toLowerCase() === "true",
      );
      return features as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ GDELT (via edge proxy, keyless) ============
export const useGdelt = (refreshMs: number) =>
  useQuery({
    queryKey: ["gdelt"],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/gdelt-events`;
      const res = await fetch(url, { headers: await edgeHeaders() });
      if (!res.ok) throw new Error("GDELT proxy failed");
      const json = await res.json();
      return json as {
        count: number;
        byRegion: Record<string, number>;
        byType: Record<string, number>;
        from: string;
        to: string;
      };
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ NASA (via edge proxy) ============
export const useNasa = (refreshMs: number) =>
  useQuery({
    queryKey: ["nasa"],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/nasa-space`;
      const res = await fetch(url, { headers: await edgeHeaders() });
      if (res.status === 503) return { notConfigured: true } as any;
      if (!res.ok) throw new Error("NASA proxy failed");
      return await res.json();
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ EIA Grid (via edge proxy) ============
export const useEiaGrid = (refreshMs: number) =>
  useQuery({
    queryKey: ["eia-grid"],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/eia-grid`;
      const res = await fetch(url, { headers: await edgeHeaders() });
      if (res.status === 503) return { notConfigured: true } as any;
      if (!res.ok) throw new Error("EIA proxy failed");
      return await res.json();
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ GDELT Headlines (via edge proxy, keyless) ============
// 15-min refresh floor — GDELT updates every 15 min and we want to be polite.
export const useGdeltHeadlines = (refreshMs: number) => {
  const interval = Math.max(refreshMs, 15 * 60 * 1000);
  return useQuery({
    queryKey: ["gdelt-headlines"],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/gdelt-headlines`;
      const res = await fetch(url, { headers: await edgeHeaders() });
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
    },
    refetchInterval: interval,
    staleTime: interval * 0.8,
    retry: 1,
  });
};

// ============ Phase 2 helpers ============
const callEdge = async (fn: string, qs = '') => {
  const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/${fn}${qs}`;
  const res = await fetch(url, { headers: await edgeHeaders() });
  if (res.status === 503) return { notConfigured: true } as any;
  if (!res.ok) throw new Error(`${fn} proxy failed (${res.status})`);
  return await res.json();
};

// ============ NWS Hazardous Weather Outlook ============
export const useNwsHwo = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["nws-hwo", lat, lng],
    queryFn: () => callEdge("nws-hwo", `?lat=${lat}&lng=${lng}`),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    retry: 1,
  });

// ============ EIA Fuel Prices (gasoline, diesel, natgas, heating oil) ============
export const useEiaFuel = (refreshMs: number) =>
  useQuery({
    queryKey: ["eia-fuel"],
    queryFn: () => callEdge("eia-fuel"),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ Freightos Baltic Index (global container freight) ============
export const useFreightosFbx = (refreshMs: number) =>
  useQuery({
    queryKey: ["freightos-fbx"],
    queryFn: () => callEdge("freightos-fbx"),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ FRED Financial Stress ============
export const useFredStress = (refreshMs: number) =>
  useQuery({
    queryKey: ["fred-stress"],
    queryFn: () => callEdge("fred-stress"),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ Power Outages ============
export const usePowerOutages = (refreshMs: number) =>
  useQuery({
    queryKey: ["power-outages"],
    queryFn: () => callEdge("power-outages"),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ Cloudflare Radar ============
export const useCloudflareRadar = (refreshMs: number) =>
  useQuery({
    queryKey: ["cloudflare-radar"],
    queryFn: () => callEdge("cloudflare-radar"),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ News Feed (via edge proxy) ============
// DEPRECATED: replaced by useGdeltHeadlines as of 2026-04-20.
// Kept temporarily; remove in follow-up after Global Headlines verifies.
export const useNewsFeed = (state: string | null, refreshMs: number) =>
  useQuery({
    queryKey: ["news-feed", state],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const qs = state ? `?state=${encodeURIComponent(state)}` : "";
      const url = `https://${projectId}.supabase.co/functions/v1/news-feed${qs}`;
      const res = await fetch(url, { headers: await edgeHeaders() });
      if (res.status === 503) return { notConfigured: true } as any;
      if (!res.ok) throw new Error("News proxy failed");
      return await res.json() as { items: Array<{ source: string; title: string; url: string; publishedAt: string; description?: string }> };
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });
