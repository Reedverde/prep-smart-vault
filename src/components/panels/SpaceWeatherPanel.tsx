import { useState, useMemo } from "react";
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
  const [sunFailed, setSunFailed] = useState(false);

  const hasData = Array.isArray(data) && data.length > 0;
  const latest = hasData ? data[data.length - 1].kp : null;
  const current = Number.isFinite(latest as number) ? (latest as number) : 0;
  const status = kpStatus(current);
  const impl = implications(current);
  const trend = (data || []).slice(-24).map((r) => ({ kp: r.kp }));

  // Cache-buster: change every 10 minutes (SDO updates ~12 min)
  const sunBucket = useMemo(() => Math.floor(Date.now() / (10 * 60 * 1000)), [dataUpdatedAt]);
  const sunSrc = `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg?b=${sunBucket}`;

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
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4">
            {!sunFailed && (
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src={sunSrc}
                  alt="Live image of the Sun, NASA SDO 193 Ångström channel"
                  width={120}
                  height={120}
                  onError={() => setSunFailed(true)}
                  className="rounded-full border border-border/60 bg-inset"
                  style={{ width: 120, height: 120, objectFit: "cover" }}
                />
                <div className="font-mono text-[10px] uppercase tracking-wider text-dim">
                  Sun now · 193Å · NASA SDO
                </div>
              </div>
            )}
            <div className="relative flex flex-col items-center">
              <SemiGauge value={current} min={0} max={9} zones={zones} />
              <div className="absolute inset-x-0 top-[22%] flex flex-col items-center pointer-events-none">
                <span className="font-mono text-[11px] uppercase tracking-wider text-dim leading-none">
                  Kp
                </span>
                <span
                  className="font-mono text-4xl font-semibold tabular-nums leading-none mt-1"
                  style={{ color: status.color, textShadow: `0 0 18px ${status.color}` }}
                >
                  {current.toFixed(1)}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-wider mt-1"
                  style={{ color: status.color }}
                >
                  {status.label}
                </span>
              </div>
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

          <div className="rounded-md bg-inset border border-border/60 p-3 max-h-[200px] overflow-y-auto scroll-thin">
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground mb-2">About Space Weather</div>
            <div className="font-mono text-xs text-dim leading-relaxed space-y-2">
              <p>
                The <span className="text-foreground">Kp index</span> (0–9) measures global geomagnetic disturbance, derived from magnetometers across 13 sub-auroral observatories. NOAA SWPC publishes a new value every 3 hours.
              </p>
              <p>
                <span className="text-severity-low">0–3 QUIET</span> · <span className="text-severity-moderate">4 UNSETTLED</span> · <span className="text-severity-severe">5–6 STORM</span> · <span className="text-severity-critical">7–9 SEVERE</span>
              </p>
              <p>
                <span className="text-foreground">Sun image:</span> NASA SDO 193 Å EUV channel showing the ~1 million °C corona. Dark patches are <span className="text-foreground">coronal holes</span> (open magnetic field lines spewing fast solar wind). Bright loops are active regions where flares originate.
              </p>
              <p>
                <span className="text-foreground">Impact rows:</span><br />
                <span className="text-foreground">Aurora</span> — visible latitude band; mid-latitudes need Kp 6+.<br />
                <span className="text-foreground">HF Radio</span> — shortwave/ham/aviation comms degrade at Kp 4+.<br />
                <span className="text-foreground">GPS</span> — positioning errors grow with ionospheric turbulence (Kp 5+).<br />
                <span className="text-foreground">Power Grid</span> — geomagnetically induced currents stress high-latitude transformers at Kp 6+.
              </p>
            </div>
          </div>
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
