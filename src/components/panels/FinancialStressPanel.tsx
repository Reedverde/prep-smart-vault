import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useFredStress } from "@/hooks/useDataSources";
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine } from "recharts";

type Level = "low" | "below" | "normal" | "elevated" | "high";

const PURPLE = "hsl(270 85% 72%)";
const PURPLE_DIM = "hsl(270 85% 72% / 0.18)";
const PURPLE_GLOW = "hsl(270 85% 72% / 0.55)";

const LEVEL_STYLE: Record<Level, string> = {
  low: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  below: "border-severity-low/30 bg-severity-low/10 text-severity-low",
  normal: "border-border/60 bg-secondary/40 text-dim",
  elevated: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  high: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

const LEVEL_LABEL: Record<Level, string> = {
  low: "LOW STRESS",
  below: "BELOW AVG",
  normal: "NORMAL",
  elevated: "ELEVATED",
  high: "HIGH STRESS",
};

const ConfigureNotice = ({ keyName }: { keyName: string }) => (
  <div className="font-mono text-xs text-dim text-center py-6 leading-relaxed">
    Configure <span className="text-foreground">{keyName}</span> in secrets to enable.
  </div>
);

const StressRing = ({ value }: { value: number }) => {
  const SIZE = 156;
  const STROKE = 8;
  const r = (SIZE - STROKE) / 2;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * r;
  // map |value| 0..3 to 0..1 of full ring
  const pct = Math.max(0, Math.min(1, Math.abs(value) / 3));
  const dash = pct * circumference;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={PURPLE_DIM}
          strokeWidth={STROKE}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={PURPLE}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{ filter: `drop-shadow(0 0 6px ${PURPLE_GLOW})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-4xl font-semibold tabular-nums leading-none"
          style={{ color: PURPLE, textShadow: `0 0 14px ${PURPLE_GLOW}` }}
        >
          {value > 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-dim mt-2">
          STLFSI
        </span>
      </div>
    </div>
  );
};

export const FinancialStressPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useFredStress(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  return (
    <Panel
      title="Financial Stress · STLFSI"
      source="FRED · weekly"
      sourceUrl="https://fred.stlouisfed.org/series/STLFSI4"
      action={
        <>
          <InfoTip>
            Composite St. Louis Fed Financial Stress Index. Combines yield spreads, credit risk, and volatility. Above 1.0 = elevated; above 2.0 = crisis-adjacent. Useful early warning for broader disruptions.
          </InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : notConfigured ? (
        <ConfigureNotice keyName={(data as any).key || "FRED_API_KEY"} />
      ) : error || !data ? (
        <PanelError message="Could not load FRED data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 pt-1">
            <StressRing value={data.stlfsi?.latest ?? 0} />
            {data.stlfsi?.level && (
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded border ${LEVEL_STYLE[data.stlfsi.level as Level]}`}
              >
                {LEVEL_LABEL[data.stlfsi.level as Level]}
              </span>
            )}
          </div>

          {data.stlfsi?.series?.length > 1 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">52 weeks</div>
              <div className="h-14 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.stlfsi.series}>
                    <YAxis hide domain={["auto", "auto"]} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="value" stroke={PURPLE} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-dim">VIX</span>
              <span className="text-foreground tabular-nums">
                {data.vix?.value != null ? data.vix.value.toFixed(1) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">Yield curve (10Y-2Y)</span>
              <span className="text-foreground tabular-nums">
                {data.yieldCurve?.value != null ? `${data.yieldCurve.value > 0 ? "+" : ""}${data.yieldCurve.value.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dim">30Y mortgage</span>
              <span className="text-foreground tabular-nums">
                {data.mortgage30?.value != null ? `${data.mortgage30.value.toFixed(2)}%` : "—"}
              </span>
            </div>
          </div>

          <ContextBox>
            Above 0 = above-average stress. Extreme events (2008, 2020) spiked past 5.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
