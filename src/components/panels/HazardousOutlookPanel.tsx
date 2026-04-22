import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useNwsHwo } from "@/hooks/useDataSources";
import { formatDistanceToNow } from "date-fns";

type Risk = "clear" | "watch" | "elevated" | "high";

const RISK_STYLE: Record<Risk, string> = {
  clear: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  watch: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  elevated: "border-severity-severe/40 bg-severity-severe/15 text-severity-severe",
  high: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

export const HazardousOutlookPanel = ({
  lat,
  lng,
  refreshMs,
}: {
  lat: number;
  lng: number;
  refreshMs: number;
}) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useNwsHwo(lat, lng, refreshMs);

  return (
    <Panel
      title="Hazard Outlook · 7d"
      source={data?.office ? `NWS ${data.office}` : "NWS"}
      sourceUrl={data?.productUrl}
      action={
        <>
          <InfoTip>
            3-7 day severe weather outlook from your local NWS office. Issued ~twice daily by forecasters. Risk level reflects today's hazard summary.
          </InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : error || !data ? (
        <PanelError message="Could not load NWS outlook" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Today's risk</div>
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${RISK_STYLE[data.dayOne?.risk as Risk] ?? RISK_STYLE.clear}`}
            >
              {data.dayOne?.risk ?? "clear"}
            </span>
          </div>

          {data.dayOne?.text && (
            <div className="font-mono text-xs text-foreground leading-relaxed">
              {data.dayOne.text}
            </div>
          )}

          {data.extended && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">
                Days 2–7
              </div>
              <div className="font-mono text-[11px] text-dim leading-relaxed">
                {data.extended}
              </div>
            </div>
          )}

          {data.spotterActivated && (
            <div className="font-mono text-[11px] px-2 py-1.5 rounded border border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate">
              Storm spotters activated
            </div>
          )}

          {!data.dayOne?.text && !data.extended && (
            <ContextBox>No hazardous weather outlook posted yet.</ContextBox>
          )}

          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground pt-2 border-t border-border/60">
            {data.issuedAt
              ? `Issued ${formatDistanceToNow(new Date(data.issuedAt), { addSuffix: true })}`
              : "Issuance time unknown"}
          </div>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
