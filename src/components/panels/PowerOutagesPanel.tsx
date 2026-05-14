import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { usePowerOutages } from "@/hooks/useDataSources";

type Severity = "clear" | "localized" | "widespread";

const SEV_STYLE: Record<Severity, string> = {
  clear: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  localized: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  widespread: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

const SEV_LABEL: Record<Severity, string> = {
  clear: "ALL CLEAR",
  localized: "LOCALIZED OUTAGES",
  widespread: "WIDESPREAD",
};

export const PowerOutagesPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = usePowerOutages(refreshMs);
  const unavailable = data?.status === "unavailable";

  return (
    <Panel
      title="Power Outages · PA"
      source={data?.source || "PowerOutage.us"}
      sourceUrl={data?.sourceUrl || "https://data.tcpalm.com/national-power-outage-map-tracker/area/lawrence-county-pa/42073/"}
      action={
        <>
          <InfoTip>
            Lawrence County and PA-state outage counts from FirstEnergy. Widespread outages nearby before yours = time to grab flashlights, charge devices, fill water containers.
          </InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error || !data ? (
        <PanelError message="Could not load outage data" onRetry={() => refetch()} />
      ) : unavailable ? (
        <div className="space-y-3">
          <div className="font-mono text-[11px] px-2 py-2 rounded border border-border/60 bg-secondary/40 text-dim leading-relaxed">
            Live county outage feed is currently unstable. As soon as one good fetch succeeds we'll show the last known totals here for up to 24 hours.
          </div>
          <ContextBox>
            The third-party scraper (PowerOutage.us via Gannett) occasionally restructures its page. For an authoritative live view check{" "}
            <a className="text-accent underline" href="https://www.firstenergycorp.com/outages.html" target="_blank" rel="noreferrer">firstenergycorp.com</a>.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Status</div>
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${SEV_STYLE[data.severity as Severity] ?? SEV_STYLE.clear}`}
            >
              {SEV_LABEL[data.severity as Severity] ?? "ALL CLEAR"}
            </span>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Lawrence County</div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-semibold text-foreground tabular-nums">
                {(data.lawrence?.customers ?? 0).toLocaleString()}
              </span>
              <span className="font-mono text-xs text-dim">customers without power</span>
            </div>
            {data.lawrence?.outages != null && data.lawrence.outages > 0 && (
              <div className="font-mono text-[10px] text-dim mt-0.5">
                {data.lawrence.outages} active outage{data.lawrence.outages === 1 ? "" : "s"}
              </div>
            )}
          </div>

          {data.paTotal != null && (
            <div className="font-mono text-[11px] text-dim">
              PA total: <span className="text-foreground tabular-nums">{data.paTotal.toLocaleString()}</span> customers
            </div>
          )}

          {Array.isArray(data.topCounties) && data.topCounties.length > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Top affected counties</div>
              {data.topCounties.map((c: any) => (
                <div key={c.name} className="flex justify-between font-mono text-[11px]">
                  <span className="text-foreground truncate">{c.name}</span>
                  <span className="text-dim tabular-nums">{c.customers.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
