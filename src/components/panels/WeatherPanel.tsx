import { Panel, StatBox, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useWeather } from "@/hooks/useDataSources";

const pct = (v: any) => (v?.value ?? v?.unitCode ? (v?.value != null ? `${Math.round(v.value)}%` : "—") : "—");
const tempFromC = (v: any, unit: string) => {
  if (v?.value == null) return "—";
  const c = v.value;
  const f = unit === "F" ? Math.round((c * 9) / 5 + 32) : Math.round(c);
  return `${f}°`;
};

export const WeatherPanel = ({
  lat,
  lng,
  refreshMs,
}: {
  lat: number;
  lng: number;
  refreshMs: number;
}) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useWeather(lat, lng, refreshMs);

  return (
    <Panel
      title="Current Weather"
      source="NWS"
      sourceUrl={`https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lng}`}
      action={
        <>
          <InfoTip>Live forecast from your nearest NWS grid point. Updates several times daily.</InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error || !data ? (
        <PanelError message="Could not load NWS forecast" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          {/* Big temp + condition */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl md:text-6xl font-semibold text-foreground tabular-nums">
              {data.period.temperature}
            </span>
            <span className="font-mono text-xl text-dim">°{data.period.temperatureUnit}</span>
            <span className="font-mono text-xs text-dim ml-auto uppercase tracking-wider">
              {data.period.name}
            </span>
          </div>
          <div className="font-mono text-sm text-foreground">{data.period.shortForecast}</div>

          {/* 4-stat grid: Wind, Precip, Humidity, Dewpoint */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox
              label="Wind"
              value={data.period.windSpeed?.split(" ")[0] || "—"}
              unit={data.period.windDirection || ""}
            />
            <StatBox
              label="Precip"
              value={pct(data.period.probabilityOfPrecipitation)}
            />
            <StatBox
              label="Humidity"
              value={pct(data.period.relativeHumidity)}
            />
            <StatBox
              label="Dewpoint"
              value={tempFromC(data.period.dewpoint, data.period.temperatureUnit)}
            />
          </div>

          {/* Upcoming periods (tonight + next 2 days) */}
          {data.upcoming && data.upcoming.length > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim mb-1.5">
                Forecast
              </div>
              {data.upcoming.slice(0, 3).map((p: any) => (
                <div
                  key={p.number}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-foreground uppercase tracking-wider">
                      {p.name}
                    </div>
                    <div className="font-mono text-[11px] text-dim truncate">
                      {p.shortForecast}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-foreground tabular-nums shrink-0">
                    {p.temperature}°{p.temperatureUnit}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ContextBox>
            {data.period.detailedForecast?.slice(0, 240)}
            {data.period.detailedForecast?.length > 240 ? "…" : ""}
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
