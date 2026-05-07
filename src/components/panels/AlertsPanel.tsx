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

const AlertCard = ({
  a,
  expanded,
  setExpanded,
  dimmed = false,
}: {
  a: any;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  dimmed?: boolean;
}) => {
  const p = a.properties;
  const isOpen = expanded === a.id;
  return (
    <div
      className={cn(
        "rounded-md bg-inset border-l-2 border-y border-r border-border",
        dimmed ? "border-l-border opacity-60" : sevBorder(p.severity),
      )}
    >
      <button
        className="w-full text-left px-3 py-2.5"
        onClick={() => setExpanded(isOpen ? null : a.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs font-semibold text-foreground">{p.event}</div>
            <div className="flex items-center gap-2 mt-1">
              <SeverityBadge level={dimmed ? "low" : sevToLevel(p.severity)}>
                {p.severity}
              </SeverityBadge>
              {dimmed && p.ends ? (
                <span className="font-mono text-[10px] text-dim">
                  Ended {formatDistanceToNow(new Date(p.ends), { addSuffix: true })}
                </span>
              ) : p.expires ? (
                <span className="font-mono text-[10px] text-dim">
                  ends {formatDistanceToNow(new Date(p.expires), { addSuffix: true })}
                </span>
              ) : null}
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
};

const RecentGroup = ({
  group,
  expanded,
  setExpanded,
}: {
  group: { event: string; latest: any; all: any[] };
  expanded: string | null;
  setExpanded: (id: string | null) => void;
}) => {
  const groupId = `recent::${group.event}`;
  const isOpen = expanded === groupId;
  const count = group.all.length;
  const latestEnds = group.latest.properties?.ends;
  return (
    <div className="rounded-md bg-inset border-l-2 border-y border-r border-border border-l-border opacity-70">
      <button
        className="w-full text-left px-3 py-2.5"
        onClick={() => setExpanded(isOpen ? null : groupId)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs font-semibold text-foreground">{group.event}</div>
            <div className="font-mono text-[10px] text-dim mt-1">
              {count} {count === 1 ? "issuance" : "issuances"}
              {latestEnds && (
                <>
                  {" · latest ended "}
                  {formatDistanceToNow(new Date(latestEnds), { addSuffix: true })}
                </>
              )}
            </div>
          </div>
          <ChevronDown className={cn("h-3 w-3 text-dim transition-transform mt-0.5", isOpen && "rotate-180")} />
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-border/60 pt-2">
          {group.all
            .slice()
            .sort((a, b) => {
              const ae = a.properties?.ends ? new Date(a.properties.ends).getTime() : 0;
              const be = b.properties?.ends ? new Date(b.properties.ends).getTime() : 0;
              return be - ae;
            })
            .map((a, i) => (
              <div key={a.id || i} className="font-mono text-[11px] text-foreground border-b border-border/30 last:border-0 pb-1.5 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-dim">
                    {a.properties?.ends
                      ? `Ended ${formatDistanceToNow(new Date(a.properties.ends), { addSuffix: true })}`
                      : "Ended —"}
                  </span>
                  <span className="text-dim text-[10px]">{a.properties?.severity}</span>
                </div>
                {a.properties?.areaDesc && (
                  <div className="text-dim text-[10px] mt-0.5 line-clamp-1">{a.properties.areaDesc}</div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
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

  const active = data?.active || [];
  const expired = data?.expired || [];
  const expiredTotal = data?.expiredTotal || 0;

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
      ) : active.length === 0 && expired.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <div className="h-10 w-10 rounded-full bg-severity-low/15 flex items-center justify-center">
            <Check className="h-5 w-5 text-severity-low" />
          </div>
          <p className="font-mono text-xs text-foreground">No active alerts</p>
          <p className="font-mono text-[10px] text-dim">All clear for this area</p>
        </div>
      ) : (
        <div className="max-h-[320px] overflow-y-auto scroll-thin -mr-1 pr-1 space-y-2">
          {/* Active alerts */}
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <div className="h-10 w-10 rounded-full bg-severity-low/15 flex items-center justify-center">
                <Check className="h-5 w-5 text-severity-low" />
              </div>
              <p className="font-mono text-xs text-foreground">No active alerts</p>
              <p className="font-mono text-[10px] text-dim">All clear for this area</p>
            </div>
          ) : (
            active.map((a: any) => (
              <AlertCard key={a.id} a={a} expanded={expanded} setExpanded={setExpanded} />
            ))
          )}

          {/* Expired alerts — past 7 days, grouped by event type */}
          {expired.length > 0 && (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-dim mt-3 mb-2 pt-3 border-t border-border/60">
                Recent · past 7 days
              </div>
              {(() => {
                type Group = { event: string; latest: any; all: any[] };
                const grouped = expired.reduce<Group[]>((acc, a: any) => {
                  const ev = a.properties?.event || "Unknown";
                  const g = acc.find((x) => x.event === ev);
                  if (g) {
                    g.all.push(a);
                    const aEnd = a.properties?.ends ? new Date(a.properties.ends).getTime() : 0;
                    const lEnd = g.latest.properties?.ends
                      ? new Date(g.latest.properties.ends).getTime()
                      : 0;
                    if (aEnd > lEnd) g.latest = a;
                  } else {
                    acc.push({ event: ev, latest: a, all: [a] });
                  }
                  return acc;
                }, []);
                return grouped.map((g) => (
                  <RecentGroup
                    key={g.event}
                    group={g}
                    expanded={expanded}
                    setExpanded={setExpanded}
                  />
                ));
              })()}
              {expiredTotal > expired.length && (
                <div className="text-[10px] text-dim font-mono mt-2">
                  + {expiredTotal - expired.length} more this week
                </div>
              )}
            </>
          )}

          <ContextBox>
            NWS severity: Extreme = immediate threat to life · Severe = significant · Moderate = possible · Minor = minimal.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
