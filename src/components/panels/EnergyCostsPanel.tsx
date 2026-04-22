import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useEiaFuel, useFreightosFbx } from "@/hooks/useDataSources";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";

type Indicator = {
  latest: number | null;
  prior: number | null;
  wow: number | null;
  wowPct: number | null;
  fourWeekPct: number | null;
  spike: boolean;
  series: Array<{ period: string; value: number }>;
  latestPeriod: string | null;
  unit: string;
} | null;

const ConfigureNotice = ({ keyName }: { keyName: string }) => (
  <div className="font-mono text-xs text-dim text-center py-6 leading-relaxed">
    Configure <span className="text-foreground">{keyName}</span> in secrets to enable.
  </div>
);

const formatValue = (v: number | null, unit: string) => {
  if (v == null) return "—";
  if (unit === "index") return v.toFixed(0);
  return `$${v.toFixed(2)}`;
};

const formatUnit = (unit: string) => {
  if (unit === "USD/gal") return "/gal";
  if (unit === "USD/MMBtu") return "/MMBtu";
  if (unit === "index") return "idx";
  return "";
};

const formatDelta = (v: number | null, unit: string) => {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  const abs = Math.abs(v);
  if (unit === "index") return `${sign}${abs.toFixed(1)}`;
  return `${sign}$${abs.toFixed(2)}`;
};

const IndicatorRow = ({ label, data }: { label: string; data: Indicator }) => {
  if (!data || data.latest == null) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div className="w-24 font-mono text-xs text-foreground">{label}</div>
        <div className="flex-1 font-mono text-[11px] text-dim">data unavailable</div>
      </div>
    );
  }

  const deltaColor =
    data.wow == null ? "text-dim" : data.wow > 0 ? "text-severity-severe" : data.wow < 0 ? "text-severity-low" : "text-dim";

  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="w-24 font-mono text-xs text-foreground shrink-0">{label}</div>
      <div className="font-mono text-xs tabular-nums text-foreground shrink-0">
        {formatValue(data.latest, data.unit)}
        <span className="text-[10px] text-dim ml-0.5">{formatUnit(data.unit)}</span>
      </div>
      <div className={`font-mono text-[11px] tabular-nums shrink-0 ${deltaColor}`}>
        {formatDelta(data.wow, data.unit)}
      </div>
      <div className="flex-1 min-w-0" />
      {data.series.length > 1 && (
        <div className="w-[60px] h-6 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.series}>
              <YAxis hide domain={["auto", "auto"]} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" strokeWidth={1.25} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="w-3 shrink-0 flex items-center justify-center">
        {data.spike && <AlertTriangle className="h-3 w-3 text-severity-moderate" />}
      </div>
    </div>
  );
};

export const EnergyCostsPanel = ({ refreshMs }: { refreshMs: number }) => {
  const eia = useEiaFuel(refreshMs);
  const fbx = useFreightosFbx(refreshMs);

  const data = eia.data as any;
  const fbxData = fbx.data as any;
  const notConfigured = data && data.notConfigured;
  const isLoading = eia.isLoading;
  const error = eia.error;
  const isFetching = eia.isFetching || fbx.isFetching;

  const refreshAll = () => {
    eia.refetch();
    fbx.refetch();
  };

  const fbxIndicator: Indicator =
    fbxData && fbxData.status !== "unavailable" && fbxData.global ? fbxData.global : null;

  const indicators: Array<{ label: string; data: Indicator }> = [
    { label: "Gasoline", data: data?.gasoline ?? null },
    { label: "Diesel", data: data?.diesel ?? null },
    { label: "Natural gas", data: data?.naturalGas ?? null },
    { label: "Heating oil", data: data?.heatingOil ?? null },
    { label: "Freight (FBX)", data: fbxIndicator },
  ];

  const working = indicators.map((i) => i.data).filter((d): d is NonNullable<Indicator> => d != null && d.latest != null);
  const flaggedCount = working.filter((d) => d.spike).length;
  const allUp = working.length > 0 && working.every((d) => d.wow != null && d.wow > 0);

  let signalLabel = "";
  let signalClass = "";
  if (working.length > 0) {
    if (flaggedCount >= 3 && allUp) {
      signalLabel = "Broad inflationary pressure";
      signalClass = "bg-severity-critical/15 text-severity-critical border-severity-critical/40";
    } else if (flaggedCount >= 3) {
      signalLabel = "Multiple indicators elevated — supply chain stress likely";
      signalClass = "bg-severity-severe/15 text-severity-severe border-severity-severe/40";
    } else if (flaggedCount === 2) {
      signalLabel = "Mixed signals — monitor";
      signalClass = "bg-severity-moderate/15 text-severity-moderate border-severity-moderate/40";
    } else {
      signalLabel = "Normal — no supply stress";
      signalClass = "bg-severity-low/15 text-severity-low border-severity-low/40";
    }
  }

  const lastUpdated = eia.dataUpdatedAt ? new Date(eia.dataUpdatedAt) : undefined;

  return (
    <Panel
      title="Energy & Supply Costs"
      source="EIA + Freightos · weekly"
      sourceUrl="https://www.eia.gov/petroleum/gasdiesel/"
      action={
        <>
          <InfoTip>
            Tracks 5 related cost indicators. Gasoline/diesel reflect fuel markets. Natural gas drives heating and grid electricity. Heating oil is a direct household cost in PA. Freightos tracks global container freight — when shipping rates spike, grocery prices often follow in 4-6 weeks.
          </InfoTip>
          {!notConfigured && <RefreshButton onClick={refreshAll} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={6} />
      ) : notConfigured ? (
        <ConfigureNotice keyName={(data as any).key || "EIA_APP_KEY"} />
      ) : error || !data ? (
        <PanelError message="Could not load energy costs" onRetry={refreshAll} />
      ) : (
        <div className="space-y-2">
          <div className="divide-y divide-border/40">
            {indicators.map((row) => (
              <IndicatorRow key={row.label} label={row.label} data={row.data} />
            ))}
          </div>

          <div className="border-t border-border/60 pt-2 space-y-2">
            {data.nationalGas?.latest != null && (
              <div className="font-mono text-[11px] text-dim">
                National gas avg: <span className="text-foreground tabular-nums">${data.nationalGas.latest.toFixed(2)}</span>
              </div>
            )}

            {signalLabel && (
              <div
                className={`font-mono text-[11px] px-2 py-1.5 rounded border ${signalClass}`}
              >
                {signalLabel}
                <span className="text-dim ml-2">({flaggedCount}/{working.length} flagged)</span>
              </div>
            )}

            <ContextBox>
              Weekly cadence. EIA updates Mondays; Henry Hub aggregated from daily. FBX is global container freight — leading indicator for grocery costs.
            </ContextBox>
            <UpdatedAgo date={lastUpdated} />
          </div>
        </div>
      )}
    </Panel>
  );
};
