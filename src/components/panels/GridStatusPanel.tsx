import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useEiaGrid } from "@/hooks/useDataSources";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export const GridStatusPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useEiaGrid(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  return (
    <Panel
      title="Grid Status"
      source="EIA · PJM"
      sourceUrl="https://www.eia.gov/opendata/"
      action={
        <>
          <InfoTip>PJM Interconnection covers PA and 12 other states. Demand + fuel mix updated hourly.</InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : notConfigured ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <p className="font-mono text-xs text-dim max-w-xs leading-relaxed">
            Not configured — contact administrator.
          </p>
        </div>
      ) : error || !data ? (
        <PanelError message="Could not load EIA data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Current demand</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                  {data.currentDemand ? Math.round(data.currentDemand).toLocaleString() : "—"}
                </span>
                <span className="font-mono text-xs text-dim">MW</span>
              </div>
            </div>
            {data.stressLevel && <StressPill level={data.stressLevel} />}
          </div>

          {(data.peakToday || data.peak7d) && (
            <div className="space-y-0.5 font-mono text-[11px]">
              {data.peakToday && (
                <div className="flex justify-between">
                  <span className="text-dim">Peak today</span>
                  <span className="text-foreground tabular-nums">
                    {Math.round(data.peakToday).toLocaleString()} MW
                  </span>
                </div>
              )}
              {data.peak7d && (
                <div className="flex justify-between">
                  <span className="text-dim">Peak 7d</span>
                  <span className="text-foreground tabular-nums">
                    {Math.round(data.peak7d).toLocaleString()} MW
                  </span>
                </div>
              )}
            </div>
          )}

          {data.demandTrend?.length > 1 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Last 24 hours</div>
              <div className="h-14 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.demandTrend}>
                    <YAxis hide domain={["auto", "auto"]} />
                    <Line type="monotone" dataKey="mw" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Fuel mix</div>
            {Object.entries(data.mix || {})
              .sort((a: any, b: any) => b[1] - a[1])
              .slice(0, 6)
              .map(([fuel, mw]: any) => {
                const pct = data.mixTotal ? (mw / data.mixTotal) * 100 : 0;
                return (
                  <div key={fuel} className="font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground truncate">{fuel}</span>
                      <span className="text-dim tabular-nums">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 bg-inset rounded overflow-hidden mt-0.5">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>

          <ContextBox>
            Demand vs. 7-day peak flags load stress. Fuel mix shows share of generation by source for the latest hour.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
