import { Panel } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { usePowerOutages } from "@/hooks/useDataSources";

type Severity = "clear" | "localized" | "widespread";

const SEV_CHIP: Record<Severity, string> = {
  clear: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  localized: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  widespread: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

const SEV_LABEL: Record<Severity, string> = {
  clear: "ALL CLEAR",
  localized: "LOCALIZED",
  widespread: "WIDESPREAD",
};

// Color of the bar for top-counties list — scales with absolute customer count.
const barColor = (n: number) => {
  if (n >= 5_000) return "bg-severity-critical";
  if (n >= 500) return "bg-severity-moderate";
  return "bg-severity-low";
};

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString();

export const PowerOutagesPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = usePowerOutages(refreshMs);
  const unavailable = data?.status === "unavailable";

  return (
    <Panel
      title="Pennsylvania Power Outages"
      source={data?.source || "PowerOutage.us"}
      sourceUrl={data?.sourceUrl || "https://poweroutage.us/area/state/pennsylvania"}
      action={
        <>
          <InfoTip>
            Live state-wide outage counts from poweroutage.us, broken down by county and utility.
            Lawrence County (your home) is highlighted. Widespread outages nearby = grab flashlights,
            charge devices, fill water containers.
          </InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={5} />
      ) : error || !data ? (
        <PanelError message="Could not load outage data" onRetry={() => refetch()} />
      ) : unavailable ? (
        <div className="space-y-3">
          <div className="font-mono text-[11px] px-2 py-2 rounded border border-border/60 bg-secondary/40 text-dim leading-relaxed">
            Live PA outage feed is temporarily unavailable. We'll show last known totals as soon as
            one good fetch succeeds.
          </div>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">
                Customers Out
              </div>
              <div className="font-mono text-3xl font-semibold text-accent tabular-nums leading-none">
                {fmt(data.state?.customersOut)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">
                Customers Tracked
              </div>
              <div className="font-mono text-3xl font-semibold text-foreground/80 tabular-nums leading-none">
                {fmt(data.state?.customersTracked)}
              </div>
            </div>
          </div>

          {/* Lawrence County row */}
          <div className="flex items-center justify-between border-y border-border/60 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                Lawrence County
              </span>
              <span className="font-mono text-base font-semibold text-foreground tabular-nums">
                {fmt(data.lawrence?.customersOut)}
              </span>
              <span className="font-mono text-[10px] text-dim">
                / {fmt(data.lawrence?.customersTracked)}
              </span>
            </div>
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                SEV_CHIP[(data.severity as Severity) ?? "clear"]
              }`}
            >
              {SEV_LABEL[(data.severity as Severity) ?? "clear"]}
            </span>
          </div>

          {/* Top affected counties */}
          {Array.isArray(data.topCounties) && data.topCounties.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim">
                Top affected counties
              </div>
              {(() => {
                const max = Math.max(...data.topCounties.map((c: any) => c.customersOut), 1);
                return data.topCounties.map((c: any) => {
                  const pct = Math.max(2, (c.customersOut / max) * 100);
                  return (
                    <div key={c.name} className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-foreground w-20 truncate">{c.name}</span>
                      <div className="flex-1 h-2 rounded-sm bg-secondary/60 overflow-hidden">
                        <div
                          className={`h-full ${barColor(c.customersOut)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-foreground tabular-nums w-14 text-right">
                        {c.customersOut.toLocaleString()}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* By utility */}
          {Array.isArray(data.byUtility) && data.byUtility.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim">
                By utility
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {data.byUtility.slice(0, 6).map((u: any) => (
                  <div key={u.name} className="flex justify-between font-mono text-[11px] gap-2">
                    <span className="text-foreground truncate">{u.name}</span>
                    <span
                      className={`tabular-nums ${
                        u.customersOut > 0 ? "text-foreground" : "text-dim"
                      }`}
                    >
                      {u.customersOut.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
