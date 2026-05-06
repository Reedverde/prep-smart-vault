import { Panel, StatBox, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useWeather } from "@/hooks/useDataSources";
import { WeatherIcon, iconForForecast } from "@/components/WeatherIcon";
import { MoonBadge } from "@/components/MoonBadge";

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const degToCompass = (deg: number | null | undefined) => {
  if (deg == null || !Number.isFinite(deg)) return "";
  return COMPASS[Math.round(((deg % 360) / 22.5)) % 16];
};

const kmhToMph = (v: number | null | undefined, unitCode?: string | null) => {
  if (v == null || !Number.isFinite(v)) return null;
  // NWS returns wmoUnit:km_h-1 typically. Some stations report m/s.
  if (unitCode && unitCode.includes("m_s-1")) return Math.round(v * 2.23694);
  return Math.round(v * 0.621371);
};

const obsAgo = (iso: string | null | undefined) => {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
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
          <InfoTip>
            Live observation from your nearest NWS station (temperature, humidity, dewpoint, wind) merged with the
            hourly forecast (next-hour precipitation chance) and the multi-day narrative forecast.
          </InfoTip>
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
          {/* Pip-Boy weather icon + moon phase row */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-accent">
              <WeatherIcon
                variant={iconForForecast(
                  data.observed?.shortForecast || data.period.shortForecast,
                  data.period.isDaytime ?? true,
                )}
                size={64}
              />
            </div>
            <div className="text-accent">
              <MoonBadge size={48} />
            </div>
          </div>

          {/* Big temp + condition (observed when available, else forecast period) */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl md:text-6xl font-semibold text-foreground tabular-nums">
              {data.observed?.temperatureF != null
                ? Math.round(data.observed.temperatureF)
                : data.period.temperature}
            </span>
            <span className="font-mono text-xl text-dim">°F</span>
            <span className="font-mono text-xs text-dim ml-auto uppercase tracking-wider">
              {data.period.name}
            </span>
          </div>
          <div className="font-mono text-sm text-foreground">
            {data.observed?.shortForecast || data.period.shortForecast}
          </div>

          {/* 4-stat grid: Wind, Precip, Humidity, Dewpoint */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox
              label="Wind"
              value={
                data.observed?.windSpeedKph != null
                  ? `${kmhToMph(data.observed.windSpeedKph, data.observed.windSpeedUnit) ?? "—"}`
                  : data.period.windSpeed?.split(" ")[0] || "—"
              }
              unit={
                data.observed?.windDirectionDeg != null
                  ? `mph ${degToCompass(data.observed.windDirectionDeg)}`
                  : data.period.windDirection || "mph"
              }
            />
            <StatBox
              label="Precip (1h)"
              value={
                data.hourlyPrecipChance != null
                  ? `${data.hourlyPrecipChance}%`
                  : data.period.probabilityOfPrecipitation?.value != null
                    ? `${Math.round(data.period.probabilityOfPrecipitation.value)}%`
                    : "—"
              }
            />
            <StatBox
              label="Humidity"
              value={data.observed?.humidity != null ? `${data.observed.humidity}%` : "—"}
            />
            <StatBox
              label="Dewpoint"
              value={
                data.observed?.dewpointF != null ? `${Math.round(data.observed.dewpointF)}°` : "—"
              }
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
          {data.observed?.timestamp ? (
            <div className="font-mono text-[10px] text-dim uppercase tracking-wider">
              Obs {obsAgo(data.observed.timestamp)}
              {data.observed.stationId ? ` · ${data.observed.stationId}` : ""}
            </div>
          ) : (
            <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
          )}
        </div>
      )}
    </Panel>
  );
};
