// Thin React Query wrappers over the pure fetchers in `src/lib/dataSources.ts`.
// Public hook signatures, query keys, intervals, and retry behavior are
// preserved exactly so /pi and the main dashboard see zero behavior change.
// /pi3 imports the pure fetchers directly to run its own coordinated cycle.

import { useQuery } from "@tanstack/react-query";
import {
  fetchWeather,
  fetchLocalAlerts,
  fetchNationalAlerts,
  fetchEarthquakes,
  fetchKpIndex,
  fetchAirQuality,
  fetchGdacs,
  fetchGdelt,
  fetchNasa,
  fetchEiaGrid,
  fetchGdeltHeadlines,
  fetchNwsHwo,
  fetchEiaFuel,
  fetchFreightosFbx,
  fetchFredStress,
  fetchPowerOutages,
  fetchCloudflareRadar,
} from "@/lib/dataSources";

// ============ NWS WEATHER ============
export const useWeather = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: () => fetchWeather(lat, lng),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

// ============ NWS LOCAL ALERTS (with 7-day history) ============
export const useLocalAlerts = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["alerts-local", lat, lng],
    queryFn: () => fetchLocalAlerts(lat, lng),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
  });

// ============ NWS NATIONAL ALERTS ============
export const useNationalAlerts = (refreshMs: number) =>
  useQuery({
    queryKey: ["alerts-national"],
    queryFn: () => fetchNationalAlerts(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
  });

// ============ USGS EARTHQUAKES ============
export const useEarthquakes = (refreshMs: number) =>
  useQuery({
    queryKey: ["earthquakes-week"],
    queryFn: () => fetchEarthquakes(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
  });

// ============ NOAA SWPC Kp ============
export const useKpIndex = (refreshMs: number) =>
  useQuery({
    queryKey: ["kp-index"],
    queryFn: () => fetchKpIndex(),
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
    queryFn: () => fetchAirQuality(lat, lng),
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
    queryFn: () => fetchGdacs(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ GDELT (via edge proxy, keyless) ============
export const useGdelt = (refreshMs: number) =>
  useQuery({
    queryKey: ["gdelt"],
    queryFn: () => fetchGdelt(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ NASA (via edge proxy) ============
export const useNasa = (refreshMs: number) =>
  useQuery({
    queryKey: ["nasa"],
    queryFn: () => fetchNasa(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ EIA Grid (via edge proxy) ============
export const useEiaGrid = (refreshMs: number) =>
  useQuery({
    queryKey: ["eia-grid"],
    queryFn: () => fetchEiaGrid(),
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
    queryFn: () => fetchGdeltHeadlines(),
    refetchInterval: interval,
    staleTime: interval * 0.8,
    retry: 1,
  });
};

// ============ NWS Hazardous Weather Outlook ============
export const useNwsHwo = (lat: number, lng: number, refreshMs: number) =>
  useQuery({
    queryKey: ["nws-hwo", lat, lng],
    queryFn: () => fetchNwsHwo(lat, lng),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    enabled: Number.isFinite(lat) && Number.isFinite(lng),
    retry: 1,
  });

// ============ EIA Fuel Prices (gasoline, diesel, natgas, heating oil) ============
export const useEiaFuel = (refreshMs: number) =>
  useQuery({
    queryKey: ["eia-fuel"],
    queryFn: () => fetchEiaFuel(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ Freightos Baltic Index (global container freight) ============
export const useFreightosFbx = (refreshMs: number) =>
  useQuery({
    queryKey: ["freightos-fbx"],
    queryFn: () => fetchFreightosFbx(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ FRED Financial Stress ============
export const useFredStress = (refreshMs: number) =>
  useQuery({
    queryKey: ["fred-stress"],
    queryFn: () => fetchFredStress(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ Power Outages ============
export const usePowerOutages = (refreshMs: number) =>
  useQuery({
    queryKey: ["power-outages"],
    queryFn: () => fetchPowerOutages(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

// ============ Cloudflare Radar ============
export const useCloudflareRadar = (refreshMs: number) =>
  useQuery({
    queryKey: ["cloudflare-radar"],
    queryFn: () => fetchCloudflareRadar(),
    refetchInterval: refreshMs,
    staleTime: refreshMs * 0.8,
    retry: 1,
  });

