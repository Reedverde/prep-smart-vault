import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo, NoDataReason } from "@/components/PanelKit";
import { useAirQuality } from "@/hooks/useDataSources";

const AQI_MAX = 300;

const aqiCategory = (aqi: number) => {
  if (aqi <= 50) return { label: "GOOD", color: "hsl(var(--severity-low))" };
  if (aqi <= 100) return { label: "MODERATE", color: "hsl(var(--severity-moderate))" };
  if (aqi <= 150) return { label: "UNHEALTHY FOR SENSITIVE", color: "hsl(var(--severity-severe))" };
  if (aqi <= 200) return { label: "UNHEALTHY", color: "hsl(var(--severity-critical))" };
  if (aqi <= 300) return { label: "VERY UNHEALTHY", color: "hsl(var(--severity-critical))" };
  return { label: "HAZARDOUS", color: "hsl(var(--severity-critical))" };
};

const tickColorForAqi = (aqi: number) => {
  if (aqi <= 50) return "hsl(var(--severity-low))";
  if (aqi <= 100) return "hsl(var(--severity-moderate))";
  if (aqi <= 150) return "hsl(var(--severity-severe))";
  return "hsl(var(--severity-critical))";
};

const POLLUTANT_INFO: Record<string, string> = {
  O3: "Ozone (O₃) — ground-level ozone irritates the lungs and worsens asthma. Highest on hot, sunny afternoons.",
  "PM2.5": "Fine particles under 2.5 microns (smoke, vehicle exhaust, wildfires). Penetrate deep into lungs and bloodstream.",
  PM10: "Coarse particles under 10 microns (dust, pollen, mold). Aggravate asthma and allergies.",
  NO2: "Nitrogen dioxide — traffic and combustion pollutant. Inflames airways with prolonged exposure.",
  SO2: "Sulfur dioxide — from fossil-fuel burning. Triggers bronchoconstriction in asthmatics.",
  CO: "Carbon monoxide — odorless gas from incomplete combustion. Reduces oxygen delivery in the body.",
};

const AqiArcGauge = ({ value }: { value: number }) => {
  const W = 240;
  const H = 150;
  const cx = W / 2;
  const cy = H - 12;
  const rOuter = 110;
  const rInner = 78;
  const TICKS = 28;
  const v = Math.max(0, Math.min(AQI_MAX, value));
  const activeIndex = Math.round((v / AQI_MAX) * (TICKS - 1));
  const cat = aqiCategory(value);

  // Pointer angle (180deg=left, 0deg=right). value 0 -> 180deg, AQI_MAX -> 0deg
  const pointerAngleDeg = 180 - (v / AQI_MAX) * 180;
  const pa = (pointerAngleDeg * Math.PI) / 180;
  const pr = rInner - 6;
  const px = cx + Math.cos(pa) * pr;
  const py = cy - Math.sin(pa) * pr;
  // triangle pointing outward along radial direction
  const pointerSize = 8;
  const perpAngle = pa + Math.PI / 2;
  const tipX = cx + Math.cos(pa) * (rInner - 1);
  const tipY = cy - Math.sin(pa) * (rInner - 1);
  const baseAx = px - Math.cos(pa) * pointerSize + Math.cos(perpAngle) * (pointerSize * 0.6);
  const baseAy = py + Math.sin(pa) * pointerSize - Math.sin(perpAngle) * (pointerSize * 0.6);
  const baseBx = px - Math.cos(pa) * pointerSize - Math.cos(perpAngle) * (pointerSize * 0.6);
  const baseBy = py + Math.sin(pa) * pointerSize + Math.sin(perpAngle) * (pointerSize * 0.6);

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {Array.from({ length: TICKS }).map((_, i) => {
          // angles from 180 (left) to 0 (right) inclusive
          const t = i / (TICKS - 1);
          const angDeg = 180 - t * 180;
          const ang = (angDeg * Math.PI) / 180;
          const aqiAtTick = t * AQI_MAX;
          const color = tickColorForAqi(aqiAtTick);
          const isActive = i <= activeIndex;
          const x1 = cx + Math.cos(ang) * rInner;
          const y1 = cy - Math.sin(ang) * rInner;
          const x2 = cx + Math.cos(ang) * rOuter;
          const y2 = cy - Math.sin(ang) * rOuter;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={isActive ? 1 : 0.18}
              style={isActive ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
            />
          );
        })}
        {/* pointer triangle */}
        <polygon
          points={`${tipX},${tipY} ${baseAx},${baseAy} ${baseBx},${baseBy}`}
          fill="hsl(var(--foreground))"
          opacity={0.95}
        />
      </svg>
      <div
        className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
        style={{ bottom: 8 }}
      >
        <span
          className="font-mono text-5xl font-semibold tabular-nums leading-none"
          style={{ color: cat.color, textShadow: `0 0 18px ${cat.color}` }}
        >
          {Math.round(value)}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.2em] mt-2"
          style={{ color: cat.color }}
        >
          {cat.label}
        </span>
      </div>
    </div>
  );
};

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
        <NoDataReason error={error} onRetry={() => refetch()} />
      ) : !observations || observations.length === 0 ? (
        <NoDataReason hasData={false} onRetry={() => refetch()} />
      ) : (
        (() => {
          const maxObs = observations.reduce((m: any, o: any) => (o.AQI > (m?.AQI ?? -1) ? o : m), null);
          return (
            <div className="space-y-4">
              <div className="flex justify-center">
                <AqiArcGauge value={maxObs.AQI} />
              </div>

              <div className="space-y-1.5">
                {observations.map((o: any, i: number) => {
                  const tip = POLLUTANT_INFO[o.ParameterName];
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between font-mono text-xs py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="text-dim uppercase tracking-wider text-[10px] inline-flex items-center gap-1">
                        {o.ParameterName}
                        {tip && <InfoTip>{tip}</InfoTip>}
                      </span>
                      <span className="text-foreground tabular-nums">
                        {o.AQI} <span className="text-dim">{o.Category?.Name}</span>
                      </span>
                    </div>
                  );
                })}
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
