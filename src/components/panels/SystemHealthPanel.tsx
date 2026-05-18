import { useEffect, useState } from "react";
import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip } from "@/components/PanelKit";
import { formatDistanceToNow, intervalToDuration, formatDuration } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";

// Each entry maps a human-readable label to one or more React-Query keys.
// `keys` lets a single row aggregate freshness across keyed variants (e.g. lat/lng).
const SOURCES: { label: string; keys: string[] }[] = [
  // Local weather + alerts
  { label: "NWS Weather", keys: ["weather"] },
  { label: "NWS Alerts (Local)", keys: ["alerts-local"] },
  { label: "NWS Alerts (National)", keys: ["alerts-national"] },
  { label: "NWS Hazardous Outlook", keys: ["nws-hwo"] },
  // Earth + space hazards
  { label: "USGS Earthquakes", keys: ["earthquakes-week"] },
  { label: "NOAA SWPC (Kp)", keys: ["kp-index"] },
  { label: "NASA (NEO/EONET)", keys: ["nasa"] },
  { label: "GDACS Disasters", keys: ["gdacs"] },
  // Air + environment
  { label: "EPA AirNow", keys: ["airnow"] },
  // Geopolitics + news
  { label: "GDELT (Conflict Pulse)", keys: ["gdelt"] },
  { label: "GDELT Headlines", keys: ["gdelt-headlines"] },
  { label: "News Feed", keys: ["news-feed"] },
  // Energy + grid
  { label: "EIA Grid (PJM)", keys: ["eia-grid"] },
  { label: "EIA Fuel Prices", keys: ["eia-fuel"] },
  { label: "Power Outages (PA)", keys: ["power-outages"] },
  // Markets
  { label: "FRED Financial Stress", keys: ["fred-stress"] },
  // Internet health
  { label: "Cloudflare Radar", keys: ["cloudflare-radar"] },
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
    // Aggregate across all queries whose key starts with any of the configured keys
    // (e.g. ["weather", lat, lng] still matches ["weather"]).
    const queries = s.keys.flatMap((k) =>
      qc.getQueryCache().findAll({ queryKey: [k], exact: false }),
    );
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

        {/* Auth status — proxied sources (AirNow, NASA, EIA, GDELT, Cloudflare,
            FRED, Power Outages, HWO) require a signed-in user JWT. */}
        <div className="rounded-md bg-inset border border-border/60 p-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-dim">Signed in</span>
          <span className="flex items-center gap-2 font-mono text-xs">
            {user ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-severity-low" />
                <span className="text-severity-low truncate max-w-[180px]">{user.email || "Authenticated"}</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-severity-critical" />
                <a href="/login" className="text-severity-critical underline">No — sign in to enable proxied sources</a>
              </>
            )}
          </span>
        </div>

        {/* Source table */}
        <div className="space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Data sources</div>
          <div className="max-h-[420px] overflow-y-auto pr-1 -mr-1 scroll-thin">
            {sourceStatus.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between py-1 border-b border-border/40 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      background: s.errored
                        ? "hsl(var(--severity-critical))"
                        : s.latest
                          ? "hsl(var(--severity-low))"
                          : "hsl(var(--dim))",
                    }}
                  />
                  <span className="font-mono text-xs text-foreground truncate">{s.label}</span>
                </div>
                <span className="font-mono text-[10px] text-dim shrink-0 ml-2">
                  {s.latest ? formatDistanceToNow(new Date(s.latest), { addSuffix: true }) : "no data"}
                </span>
              </div>
            ))}
          </div>
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
