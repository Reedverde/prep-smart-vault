import { Panel, StatBox, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useWeather } from "@/hooks/useDataSources";
import { Wind, Droplets } from "lucide-react";

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
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl md:text-6xl font-semibold text-foreground tabular-nums">
              {data.period.temperature}
            </span>
            <span className="font-mono text-xl text-dim">°{data.period.temperatureUnit}</span>
          </div>
          <div className="font-mono text-sm text-foreground">{data.period.shortForecast}</div>
          <div className="grid grid-cols-2 gap-2">
            <StatBox
              label="Wind"
              value={data.period.windSpeed?.split(" ")[0] || "—"}
              unit={data.period.windDirection || ""}
            />
            <StatBox
              label="Next"
              value={data.nextPeriod?.temperature ?? "—"}
              unit={`°${data.nextPeriod?.temperatureUnit || "F"}`}
              hint={data.nextPeriod?.name}
            />
          </div>
          <ContextBox>
            {data.period.detailedForecast?.slice(0, 200)}
            {data.period.detailedForecast?.length > 200 ? "…" : ""}
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
