import { useQuery } from "@tanstack/react-query";

const UA = "PrepPi (situational-awareness-app)";
const nwsHeaders = { "User-Agent": UA, Accept: "application/geo+json" };

// ============ NWS WEATHER ============
export const useWeather = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: async () => {
      const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lng}`, { headers: nwsHeaders });
      if (!pointRes.ok) throw new Error("NWS points failed");
      const point = await pointRes.json();
      const fcRes = await fetch(point.properties.forecast, { headers: nwsHeaders });
      if (!fcRes.ok) throw new Error("NWS forecast failed");
      const fc = await fcRes.json();
      return {
        period: fc.properties.periods[0],
        nextPeriod: fc.properties.periods[1],
        forecastUrl: point.properties.forecast,
      };
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

// ============ NWS LOCAL ALERTS ============
export const useLocalAlerts = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["alerts-local", lat, lng],
    queryFn: async () => {
      const res = await fetch(`https://api.weather.gov/alerts/active?point=${lat},${lng}`, { headers: nwsHeaders });
      if (!res.ok) throw new Error("NWS alerts failed");
      const json = await res.json();
      return json.features as Array<any>;
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
      const res = await fetch(url, {
        headers: {
          apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${(import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
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
export const useGdacs = (refreshMs: number) =>
  useQuery({
    queryKey: ["gdacs"],
    queryFn: async () => {
      const res = await fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=&toDate=&alertlevel=Green;Orange;Red&eventlist=EQ;TC;FL;VO;DR;WF");
      if (!res.ok) throw new Error("GDACS failed");
      const json = await res.json();
      const features = json?.features || [];
      return features as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ ACLED (via edge proxy) ============
export const useAcled = (refreshMs: number) =>
  useQuery({
    queryKey: ["acled"],
    queryFn: async () => {
      const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/acled-events`;
      const res = await fetch(url, {
        headers: {
          apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${(import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (res.status === 503) {
        return { notConfigured: true } as any;
      }
      if (!res.ok) throw new Error("ACLED proxy failed");
      const json = await res.json();
      return json;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });
