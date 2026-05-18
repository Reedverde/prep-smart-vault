// /pi3 orchestrator — single coordinated 60s fetch wave with capped concurrency.
// Consumes the same pure fetchers in `src/lib/dataSources.ts` that /pi and the
// main dashboard reach via React Query. No React Query here on purpose: /pi3
// needs one coordinated wave, not per-hook intervals firing in parallel.

import { useEffect, useRef, useState } from "react";
import {
  fetchWeather,
  fetchLocalAlerts,
  fetchNationalAlerts,
  fetchAirQuality,
  fetchEarthquakes,
  fetchKpIndex,
  fetchGdacs,
  fetchGdelt,
  fetchGdeltHeadlines,
  fetchEiaFuel,
  fetchEiaGrid,
  fetchFredStress,
  fetchPowerOutages,
  fetchCloudflareRadar,
  fetchNwsHwo,
} from "@/lib/dataSources";

type Slot =
  | "weather" | "localAlerts" | "natAlerts" | "air" | "quakes"
  | "kp" | "gdacs" | "conflict" | "headlines" | "fuel"
  | "grid" | "stress" | "outages" | "internet" | "hwo";

export type Pi3Data = Partial<Record<Slot, any>>;
export type Pi3Errors = Partial<Record<Slot, true>>;

const BATCH_SIZE = 3;
const WAVE_MS = 60_000;

type Job = { key: Slot; run: () => Promise<any> };

const makeJobs = (lat: number, lng: number): Job[] => [
  { key: "weather",     run: () => fetchWeather(lat, lng) },
  { key: "localAlerts", run: () => fetchLocalAlerts(lat, lng) },
  { key: "natAlerts",   run: () => fetchNationalAlerts() },
  { key: "air",         run: () => fetchAirQuality(lat, lng) },
  { key: "quakes",      run: () => fetchEarthquakes() },
  { key: "kp",          run: () => fetchKpIndex() },
  { key: "gdacs",       run: () => fetchGdacs() },
  { key: "conflict",    run: () => fetchGdelt() },
  { key: "headlines",   run: () => fetchGdeltHeadlines() },
  { key: "fuel",        run: () => fetchEiaFuel() },
  { key: "grid",        run: () => fetchEiaGrid() },
  { key: "stress",      run: () => fetchFredStress() },
  { key: "outages",     run: () => fetchPowerOutages() },
  { key: "internet",    run: () => fetchCloudflareRadar() },
  { key: "hwo",         run: () => fetchNwsHwo(lat, lng) },
];

// One soft retry on any failure (not just network). /pi3 sees the whole world
// through this loop — a single 5xx blip shouldn't blank a tile for 60s.
const runWithRetry = async (job: Job) => {
  try { return await job.run(); }
  catch {
    await new Promise((r) => setTimeout(r, 1500));
    return await job.run();
  }
};

export const usePi3Data = (lat: number, lng: number) => {
  const [data, setData] = useState<Pi3Data>({});
  const [errors, setErrors] = useState<Pi3Errors>({});
  const [lastWaveAt, setLastWaveAt] = useState<Date | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const jobs = makeJobs(lat, lng);

    const runWave = async () => {
      for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
        if (cancelledRef.current) return;
        const batch = jobs.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(runWithRetry));
        if (cancelledRef.current) return;
        setData((prev) => {
          const next = { ...prev };
          batch.forEach((j, k) => {
            const r = results[k];
            if (r.status === "fulfilled") next[j.key] = r.value;
          });
          return next;
        });
        setErrors((prev) => {
          const next = { ...prev };
          batch.forEach((j, k) => {
            const r = results[k];
            if (r.status === "rejected") next[j.key] = true;
            else delete next[j.key];
          });
          return next;
        });
      }
      if (!cancelledRef.current) setLastWaveAt(new Date());
    };

    runWave();
    const t = setInterval(runWave, WAVE_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(t);
    };
  }, [lat, lng]);

  return { data, errors, lastWaveAt };
};
