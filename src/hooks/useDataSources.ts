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
      const json = (await res.json()) as Array<Array<string>>;
      const rows = json.slice(1).map((r) => ({
        time: r[0],
        kp: parseFloat(r[1]),
      }));
      return rows;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
  });

// ============ EPA AIRNOW ============
export const useAirQuality = (
  lat: number,
  lng: number,
  apiKey: string | null,
  refreshMs: number,
) =>
  useQuery({
    queryKey: ["airnow", lat, lng, !!apiKey],
    queryFn: async () => {
      if (!apiKey) return null;
      const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${lat}&longitude=${lng}&distance=25&API_KEY=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("AirNow failed");
      return (await res.json()) as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: !!apiKey && Number.isFinite(lat) && Number.isFinite(lng),
  });

// ============ GDACS ============
export const useGdacs = (refreshMs: number) =>
  useQuery({
    queryKey: ["gdacs"],
    queryFn: async () => {
      // GDACS RSS — use a CORS-friendly fallback via their JSON endpoint
      const res = await fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?fromDate=&toDate=&alertlevel=Green;Orange;Red&eventlist=EQ;TC;FL;VO;DR;WF");
      if (!res.ok) throw new Error("GDACS failed");
      const json = await res.json();
      // Returns FeatureCollection
      const features = json?.features || [];
      return features as Array<any>;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ ACLED ============
export const useAcled = (
  email: string | null,
  apiKey: string | null,
  refreshMs: number,
) =>
  useQuery({
    queryKey: ["acled", !!apiKey],
    queryFn: async () => {
      if (!apiKey || !email) return null;
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const url = `https://api.acleddata.com/acled/read?key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}&limit=0&event_date=${fmt(weekAgo)}|${fmt(today)}&event_date_where=BETWEEN`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("ACLED failed");
      const json = await res.json();
      return json;
    },
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: !!apiKey && !!email,
    retry: 1,
  });
