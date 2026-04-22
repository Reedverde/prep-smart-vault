import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useEiaGrid } from "@/hooks/useDataSources";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

type Stress = "normal" | "elevated" | "stressed" | "critical";

const STRESS_STYLE: Record<Stress, string> = {
  normal: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  elevated: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  stressed: "border-severity-severe/40 bg-severity-severe/15 text-severity-severe",
  critical: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

const StressPill = ({ level }: { level: Stress }) => (
  <span
    className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STRESS_STYLE[level]}`}
  >
    {level}
  </span>
);

// Per-fuel color tokens (semantic). Falls back to dim accent.
const fuelColor = (fuel: string): string => {
  const f = fuel.toLowerCase();
  if (f.includes("gas") || f.includes("natural")) return "bg-severity-moderate";
  if (f.includes("nuclear")) return "bg-severity-low";
  if (f.includes("coal")) return "bg-severity-critical";
  if (f.includes("wind")) return "bg-accent";
  if (f.includes("hydro") || f.includes("water")) return "bg-primary";
  if (f.includes("solar")) return "bg-severity-moderate";
  if (f.includes("oil") || f.includes("petroleum")) return "bg-severity-severe";
  return "bg-dim";
};

export const GridStatusPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useEiaGrid(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  // Compute warning banner data
  let warning: { text: string; tone: "critical" | "moderate" } | null = null;
  if (data && !notConfigured && !error) {
    const stressPct = data.peakToday && data.currentDemand
      ? (data.currentDemand / data.peakToday) * 100
      : null;
    if (data.stressLevel === "critical" || (stressPct !== null && stressPct >= 95)) {
      const pctTxt = stressPct !== null ? `${Math.round(stressPct)}%` : "high";
      warning = {
        text: `HIGH LOAD WARNING · ${pctTxt} of today's peak`,
        tone: "critical",
      };
    } else if (
      data.stressLevel === "stressed" &&
      data.peakToday &&
      data.peak7d &&
      data.peakToday >= data.peak7d * 0.98
    ) {
      warning = { text: "Approaching weekly peak", tone: "moderate" };
    }
  }

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
          {warning && (
            <div
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1.5 rounded border ${
                warning.tone === "critical"
                  ? "border-severity-critical/50 bg-severity-critical/15 text-severity-critical"
                  : "border-severity-moderate/50 bg-severity-moderate/15 text-severity-moderate"
              }`}
            >
              ⚠ {warning.text}
            </div>
          )}

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
                const mwNum = Number(mw) || 0;
                return (
                  <div key={fuel} className="font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground truncate">{fuel}</span>
                      <span className="text-dim tabular-nums">
                        {pct.toFixed(0)}% · {Math.round(mwNum).toLocaleString()} MW
                      </span>
                    </div>
                    <div className="h-1.5 bg-inset rounded overflow-hidden mt-0.5">
                      <div className={`h-full ${fuelColor(fuel)}`} style={{ width: `${pct}%` }} />
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
