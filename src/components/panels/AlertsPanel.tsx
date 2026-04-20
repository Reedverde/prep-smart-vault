import { useState } from "react";
import { Panel, ContextBox, SeverityBadge } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useLocalAlerts } from "@/hooks/useDataSources";
import { Check, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const sevToLevel = (s: string): "low" | "moderate" | "severe" | "critical" => {
  if (s === "Extreme") return "critical";
  if (s === "Severe") return "severe";
  if (s === "Moderate") return "moderate";
  return "low";
};

const sevBorder = (s: string) => {
  if (s === "Extreme" || s === "Severe") return "border-l-severity-critical";
  if (s === "Moderate") return "border-l-severity-moderate";
  return "border-l-accent";
};

export const AlertsPanel = ({
  lat,
  lng,
  refreshMs,
}: {
  lat: number;
  lng: number;
  refreshMs: number;
}) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useLocalAlerts(lat, lng, refreshMs);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Panel
      title="Active Alerts"
      source="NWS CAP v1.2"
      sourceUrl="https://www.weather.gov/documentation/services-web-api"
      action={
        <>
          <InfoTip>NWS active alerts for your location. Severity scale: Extreme (life threat), Severe (significant), Moderate (possible), Minor.</InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={3} />
      ) : error ? (
        <PanelError message="Could not load alerts" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <div className="h-10 w-10 rounded-full bg-severity-low/15 flex items-center justify-center">
            <Check className="h-5 w-5 text-severity-low" />
          </div>
          <p className="font-mono text-xs text-foreground">No active alerts</p>
          <p className="font-mono text-[10px] text-dim">All clear for this area</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((a: any) => {
            const p = a.properties;
            const isOpen = expanded === a.id;
            return (
              <div
                key={a.id}
                className={cn("rounded-md bg-inset border-l-2 border-y border-r border-border", sevBorder(p.severity))}
              >
                <button
                  className="w-full text-left px-3 py-2.5"
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs font-semibold text-foreground">{p.event}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <SeverityBadge level={sevToLevel(p.severity)}>{p.severity}</SeverityBadge>
                        {p.expires && (
                          <span className="font-mono text-[10px] text-dim">
                            ends {formatDistanceToNow(new Date(p.expires), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-dim mt-1.5 line-clamp-2">{p.headline}</div>
                    </div>
                    <ChevronDown className={cn("h-3 w-3 text-dim transition-transform mt-0.5", isOpen && "rotate-180")} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-1.5 border-t border-border/60 pt-2">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Area</div>
                    <div className="font-mono text-xs text-foreground">{p.areaDesc}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-dim mt-2">Description</div>
                    <p className="font-mono text-[11px] text-foreground whitespace-pre-wrap leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          <ContextBox>
            NWS severity: Extreme = immediate threat to life · Severe = significant · Moderate = possible · Minor = minimal.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
