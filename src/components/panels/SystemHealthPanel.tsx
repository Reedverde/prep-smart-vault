import { useEffect, useState } from "react";
import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip } from "@/components/PanelKit";
import { formatDistanceToNow, intervalToDuration, formatDuration } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";

const SOURCES: { key: string; label: string }[] = [
  { key: "weather", label: "NWS Weather" },
  { key: "alerts-local", label: "NWS Alerts" },
  { key: "alerts-national", label: "NWS National" },
  { key: "earthquakes-week", label: "USGS" },
  { key: "kp-index", label: "NOAA SWPC" },
  { key: "airnow", label: "EPA AirNow" },
  { key: "gdacs", label: "GDACS" },
  { key: "acled", label: "ACLED" },
];

export const SystemHealthPanel = ({ refreshMin }: { refreshMin: number }) => {
  const qc = useQueryClient();
  const [online, setOnline] = useState(navigator.onLine);
  const [sessionStart] = useState(() => new Date());
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  const sourceStatus = SOURCES.map((s) => {
    const queries = qc.getQueryCache().findAll({ queryKey: [s.key] });
    const latest = queries.reduce((max, q) => Math.max(max, q.state.dataUpdatedAt || 0), 0);
    const errored = queries.some((q) => q.state.status === "error");
    return { ...s, latest, errored };
  });

  const lastFullRefresh = sourceStatus.reduce((max, s) => Math.max(max, s.latest), 0);
  const uptime = formatDuration(
    intervalToDuration({ start: sessionStart, end: new Date() }),
    { format: ["hours", "minutes"], zero: false },
  ) || "< 1 min";

  return (
    <Panel
      title="System Health"
      source="Local"
      action={<InfoTip>Monitors data source reachability and dashboard freshness. Pi integration arrives later.</InfoTip>}
    >
      <div className="space-y-3">
        {/* Connectivity */}
        <div className="rounded-md bg-inset border border-border/60 p-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">Connectivity</span>
          <span className="flex items-center gap-2 font-mono text-xs">
            {online ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-severity-low" />
                <span className="text-severity-low">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-severity-critical" />
                <span className="text-severity-critical">Offline</span>
              </>
            )}
          </span>
        </div>

        {/* Source table */}
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Data sources</div>
          {sourceStatus.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: s.errored
                      ? "hsl(var(--severity-critical))"
                      : s.latest
                        ? "hsl(var(--severity-low))"
                        : "hsl(var(--dim))",
                  }}
                />
                <span className="font-mono text-xs text-foreground">{s.label}</span>
              </div>
              <span className="font-mono text-[10px] text-dim">
                {s.latest ? formatDistanceToNow(new Date(s.latest), { addSuffix: true }) : "no data"}
              </span>
            </div>
          ))}
        </div>

        {/* Meta */}
        <div className="space-y-1 pt-1">
          <Meta label="Refresh interval" value={`${refreshMin} min`} />
          <Meta
            label="Last full refresh"
            value={lastFullRefresh ? formatDistanceToNow(new Date(lastFullRefresh), { addSuffix: true }) : "—"}
          />
          <Meta label="Session uptime" value={uptime} />
        </div>

        <ContextBox>
          When the Pi mirror is integrated, this panel will also show CPU, memory, storage, and Drive sync status.
        </ContextBox>
      </div>
    </Panel>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between font-mono text-xs">
    <span className="text-[10px] uppercase tracking-wider text-dim">{label}</span>
    <span className="text-foreground">{value}</span>
  </div>
);
