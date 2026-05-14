import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo, SemiGauge } from "@/components/PanelKit";
import { useAirQuality } from "@/hooks/useDataSources";

const aqiCategory = (aqi: number) => {
  if (aqi <= 50) return { label: "GOOD", color: "hsl(var(--severity-low))" };
  if (aqi <= 100) return { label: "MODERATE", color: "hsl(var(--severity-moderate))" };
  if (aqi <= 150) return { label: "UNHEALTHY FOR SENSITIVE", color: "hsl(var(--severity-severe))" };
  if (aqi <= 200) return { label: "UNHEALTHY", color: "hsl(var(--severity-critical))" };
  if (aqi <= 300) return { label: "VERY UNHEALTHY", color: "hsl(var(--severity-critical))" };
  return { label: "HAZARDOUS", color: "hsl(var(--severity-critical))" };
};

const POLLUTANT_INFO: Record<string, string> = {
  O3: "Ozone (O₃) — ground-level ozone irritates the lungs and worsens asthma. Highest on hot, sunny afternoons.",
  "PM2.5": "Fine particles under 2.5 microns (smoke, vehicle exhaust, wildfires). Penetrate deep into lungs and bloodstream.",
  PM10: "Coarse particles under 10 microns (dust, pollen, mold). Aggravate asthma and allergies.",
  NO2: "Nitrogen dioxide — traffic and combustion pollutant. Inflames airways with prolonged exposure.",
  SO2: "Sulfur dioxide — from fossil-fuel burning. Triggers bronchoconstriction in asthmatics.",
  CO: "Carbon monoxide — odorless gas from incomplete combustion. Reduces oxygen delivery in the body.",
};

const zones = [
  { from: 0, to: 50, color: "hsl(var(--severity-low))" },
  { from: 50, to: 100, color: "hsl(var(--severity-moderate))" },
  { from: 100, to: 150, color: "hsl(var(--severity-severe))" },
  { from: 150, to: 300, color: "hsl(var(--severity-critical))" },
];

export const AirQualityPanel = ({
  lat,
  lng,
  refreshMs,
}: {
  lat: number;
  lng: number;
  refreshMs: number;
}) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useAirQuality(lat, lng, refreshMs);

  const notConfigured = data && typeof data === "object" && !Array.isArray(data) && (data as any).notConfigured;
  const observations = Array.isArray(data) ? data : null;

  return (
    <Panel
      title="Air Quality Index"
      source="EPA AirNow"
      sourceUrl="https://www.airnowapi.org/"
      action={
        <>
          <InfoTip>AQI 0–50 Good · 51–100 Moderate · 101–150 Sensitive groups · 151–200 Unhealthy · 201+ Very Unhealthy.</InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={3} />
      ) : notConfigured ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <p className="font-mono text-xs text-dim max-w-xs leading-relaxed">
            Air quality data is not configured yet. Contact the administrator to enable this panel.
          </p>
        </div>
      ) : error ? (
        <PanelError message="Could not load AirNow data" onRetry={() => refetch()} />
      ) : !observations || observations.length === 0 ? (
        <PanelError message="No AQI data near your location" onRetry={() => refetch()} />
      ) : (
        (() => {
          const maxObs = observations.reduce((m: any, o: any) => (o.AQI > (m?.AQI ?? -1) ? o : m), null);
          const cat = aqiCategory(maxObs.AQI);
          return (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <SemiGauge value={Math.min(maxObs.AQI, 300)} min={0} max={300} zones={zones} />
                <div className="flex items-baseline gap-2 -mt-1">
                  <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color: cat.color }}>
                    {maxObs.AQI}
                  </span>
                </div>
                <div
                  className="font-mono text-[10px] uppercase tracking-wider mt-1"
                  style={{ color: cat.color }}
                >
                  {cat.label}
                </div>
              </div>

              <div className="space-y-1.5">
                {observations.map((o: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between font-mono text-xs py-1 border-b border-border/40 last:border-0"
                  >
                    <span className="text-dim uppercase tracking-wider text-[10px]">{o.ParameterName}</span>
                    <span className="text-foreground tabular-nums">
                      {o.AQI} <span className="text-dim">{o.Category?.Name}</span>
                    </span>
                  </div>
                ))}
              </div>

              <ContextBox>
                AQI represents the worst pollutant nearby. Sensitive groups (kids, elderly, asthma, heart) should reduce outdoor activity above 100.
              </ContextBox>
              <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
            </div>
          );
        })()
      )}
    </Panel>
  );
};
