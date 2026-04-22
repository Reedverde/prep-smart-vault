import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useEiaFuel } from "@/hooks/useDataSources";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

const ConfigureNotice = ({ keyName }: { keyName: string }) => (
  <div className="font-mono text-xs text-dim text-center py-6 leading-relaxed">
    Configure <span className="text-foreground">{keyName}</span> in secrets to enable.
  </div>
);

export const FuelPricesPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useEiaFuel(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  return (
    <Panel
      title="Fuel Prices · Mid-Atlantic"
      source="EIA · weekly"
      sourceUrl="https://www.eia.gov/petroleum/gasdiesel/"
      action={
        <>
          <InfoTip>
            Regional gasoline prices from EIA. Sharp spikes (&gt;5% weekly or &gt;10% monthly) often signal supply disruption — refinery, pipeline, or geopolitical. Top off when sustained upward trend appears.
          </InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : notConfigured ? (
        <ConfigureNotice keyName={(data as any).key || "EIA_APP_KEY"} />
      ) : error || !data ? (
        <PanelError message="Could not load fuel prices" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Regional avg</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-3xl font-semibold text-foreground tabular-nums">
                  {data.regional?.latest != null ? `$${data.regional.latest.toFixed(2)}` : "—"}
                </span>
                <span className="font-mono text-xs text-dim">/gal</span>
              </div>
            </div>
            {data.regional?.wow != null && (
              <span
                className={`font-mono text-xs tabular-nums ${
                  data.regional.wow > 0 ? "text-severity-severe" : data.regional.wow < 0 ? "text-severity-low" : "text-dim"
                }`}
              >
                {data.regional.wow > 0 ? "+" : ""}${data.regional.wow.toFixed(2)} wow
              </span>
            )}
          </div>

          {data.national?.latest != null && (
            <div className="font-mono text-[11px] text-dim">
              National avg: <span className="text-foreground tabular-nums">${data.national.latest.toFixed(2)}</span>
            </div>
          )}

          {data.regional?.series?.length > 1 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">12-week trend</div>
              <div className="h-14 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.regional.series}>
                    <YAxis hide domain={["auto", "auto"]} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {data.spike && (
            <div className="font-mono text-[11px] px-2 py-1.5 rounded border border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate">
              Spike: {data.regional?.fourWeekPct != null ? `${data.regional.fourWeekPct > 0 ? "+" : ""}${data.regional.fourWeekPct.toFixed(0)}% in 4 weeks` : "weekly change >5%"} — possible supply issue
            </div>
          )}

          <ContextBox>
            EIA Central Atlantic series (PADD 1B, includes PA). Updated Mondays.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
