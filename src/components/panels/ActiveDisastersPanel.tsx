import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdacs } from "@/hooks/useDataSources";

const typeAbbrev: Record<string, string> = {
  EQ: "EQ",
  TC: "TC",
  FL: "FL",
  VO: "VO",
  DR: "DR",
  WF: "WF",
};

const alertPillClass = (level: string) => {
  const l = (level || "").toLowerCase();
  if (l === "red") return "bg-severity-critical/15 text-severity-critical border-severity-critical/40";
  if (l === "orange") return "bg-severity-moderate/15 text-severity-moderate border-severity-moderate/40";
  return "bg-secondary/40 text-dim border-border/60";
};

export const ActiveDisastersPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, isFetching, refetch, dataUpdatedAt } = useGdacs(refreshMs);

  const events = data || [];
  const count = events.length;
  const top = events.slice(0, 5);

  return (
    <Panel
      title="Active Disasters"
      source="GDACS"
      sourceUrl="https://www.gdacs.org/"
      action={
        <>
          <InfoTip>
            Currently-active GDACS events at Orange (humanitarian impact likely) or Red (severe) alert level. Green minor events excluded.
          </InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error ? (
        <PanelError message="Could not load GDACS data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold text-foreground tabular-nums">{count}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-dim">active Orange/Red events</span>
          </div>

          <div className="space-y-1.5">
            {top.length === 0 ? (
              <div className="font-mono text-xs text-dim py-2">No active major events.</div>
            ) : (
              top.map((e: any, i: number) => {
                const p = e.properties || {};
                const type = typeAbbrev[p.eventtype] || p.eventtype || "—";
                const location = p.country || p.name || p.htmldescription || "Unknown";
                const level = p.alertlevel || "";
                const url = p.url?.report || p.url?.details || `https://www.gdacs.org/`;
                return (
                  <a
                    key={p.eventid ? `${p.eventtype}-${p.eventid}` : i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 py-1 hover:bg-secondary/40 rounded px-1 transition-colors"
                  >
                    <span className="font-mono text-[10px] font-semibold text-dim w-7 shrink-0">{type}</span>
                    <span className="font-mono text-[11px] text-foreground flex-1 truncate">{location}</span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${alertPillClass(level)}`}
                    >
                      {level || "—"}
                    </span>
                  </a>
                );
              })
            )}
          </div>

          <ContextBox>
            GDACS (Global Disaster Alert and Coordination System) issues Green/Orange/Red alerts within minutes of major events worldwide.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
