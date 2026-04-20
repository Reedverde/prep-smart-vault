import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo, SemiGauge } from "@/components/PanelKit";
import { useKpIndex } from "@/hooks/useDataSources";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip as ReTooltip } from "recharts";

const kpStatus = (kp: number) => {
  if (kp < 3) return { label: "QUIET", color: "hsl(var(--severity-low))" };
  if (kp < 5) return { label: "UNSETTLED", color: "hsl(var(--severity-moderate))" };
  if (kp < 7) return { label: "STORM", color: "hsl(var(--severity-severe))" };
  return { label: "SEVERE", color: "hsl(var(--severity-critical))" };
};

const implications = (kp: number) => ({
  aurora: kp < 4 ? "High latitudes only" : kp < 6 ? "Northern tier US" : "Mid-latitudes possible",
  hf: kp < 4 ? "None" : kp < 6 ? "Minor" : "Significant degradation",
  gps: kp < 5 ? "Negligible" : "Moderate errors possible",
  grid: kp < 6 ? "None" : "Voltage swings possible",
});

const zones = [
  { from: 0, to: 3, color: "hsl(var(--severity-low))" },
  { from: 3, to: 5, color: "hsl(var(--severity-moderate))" },
  { from: 5, to: 7, color: "hsl(var(--severity-severe))" },
  { from: 7, to: 9, color: "hsl(var(--severity-critical))" },
];

export const SpaceWeatherPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useKpIndex(refreshMs);

  const hasData = Array.isArray(data) && data.length > 0;
  const latest = hasData ? data[data.length - 1].kp : null;
  const current = Number.isFinite(latest as number) ? (latest as number) : 0;
  const status = kpStatus(current);
  const impl = implications(current);
  const trend = (data || []).slice(-24).map((r) => ({ kp: r.kp }));

  return (
    <Panel
      title="Space Weather"
      source="NOAA SWPC"
      sourceUrl="https://www.swpc.noaa.gov/products/planetary-k-index"
      action={
        <>
          <InfoTip>Kp 0–9 measures geomagnetic disturbance. 0–3 quiet · 4 unsettled · 5–6 storm · 7–9 severe.</InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error || !data ? (
        <PanelError message="Could not load SWPC data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <SemiGauge value={current} min={0} max={9} zones={zones} />
            <div className="flex items-baseline gap-2 -mt-1">
              <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">
                Kp {current.toFixed(1)}
              </span>
              <span
                className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{ color: status.color, borderColor: status.color }}
              >
                {status.label}
              </span>
            </div>
          </div>

          <div className="h-16 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <YAxis hide domain={[0, 9]} />
                <Line type="monotone" dataKey="kp" stroke="hsl(var(--accent))" strokeWidth={1.5} dot={false} />
                <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11, fontFamily: "monospace" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <Row label="Aurora" value={impl.aurora} />
            <Row label="HF Radio" value={impl.hf} />
            <Row label="GPS" value={impl.gps} />
            <Row label="Power Grid" value={impl.grid} />
          </div>

          <ContextBox>
            Kp index 0–9 measures global geomagnetic disturbance. 5+ may impact GPS, HF radio, and high-latitude power grids.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-0.5 border-b border-border/40 last:border-0">
    <span className="text-dim uppercase tracking-wider text-[10px]">{label}</span>
    <span className="text-foreground">{value}</span>
  </div>
);
