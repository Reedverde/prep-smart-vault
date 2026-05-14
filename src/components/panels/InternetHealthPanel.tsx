import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useCloudflareRadar } from "@/hooks/useDataSources";

type AttackLevel = "low" | "medium" | "high";

const ATTACK_STYLE: Record<AttackLevel, string> = {
  low: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  medium: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  high: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

const ConfigureNotice = ({ keyName }: { keyName: string }) => (
  <div className="font-mono text-xs text-dim text-center py-6 leading-relaxed">
    Configure <span className="text-foreground">{keyName}</span> in secrets to enable.
  </div>
);

export const InternetHealthPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useCloudflareRadar(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  return (
    <Panel
      title="Internet Health · Global"
      source="Cloudflare Radar"
      sourceUrl="https://radar.cloudflare.com/"
      action={
        <>
          <InfoTip>
            Compares right-now US web traffic to the past 7-day average across Cloudflare's network (~20% of the internet). Swings beyond ±15% often signal a major outage, BGP route leak, or an unusual spike (holiday, viral event). Attack level summarizes worldwide layer-7 (HTTP) DDoS volume.
          </InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : notConfigured ? (
        <ConfigureNotice keyName={(data as any).key || "CLOUDFLARE_RADAR_API_TOKEN"} />
      ) : error || !data ? (
        <PanelError message="Could not load Cloudflare Radar data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">US traffic vs 7d avg</div>
              <span
                className={`font-mono text-3xl font-semibold tabular-nums ${
                  data.trafficDeltaPct == null
                    ? "text-foreground"
                    : Math.abs(data.trafficDeltaPct) > 15
                    ? "text-severity-severe"
                    : "text-severity-low"
                }`}
              >
                {data.trafficDeltaPct != null
                  ? `${data.trafficDeltaPct > 0 ? "+" : ""}${data.trafficDeltaPct.toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${ATTACK_STYLE[data.attackLevel as AttackLevel] ?? ATTACK_STYLE.low}`}
            >
              attacks: {data.attackLevel}
            </span>
          </div>

          {data.anomalyNote && (
            <div className="font-mono text-[11px] px-2 py-1.5 rounded border border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate">
              {data.anomalyNote}
            </div>
          )}

          {Array.isArray(data.topTargets) && data.topTargets.length > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Top attack targets (7d)</div>
              {data.topTargets.map((t: any, i: number) => (
                <div key={`${t.name}-${i}`} className="flex justify-between font-mono text-[11px]">
                  <span className="text-foreground truncate">{t.name}</span>
                  <span className="text-dim tabular-nums">{t.value ? t.value.toFixed(1) : "—"}</span>
                </div>
              ))}
            </div>
          )}

          <ContextBox>
            <a
              href="https://radar.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Open full Cloudflare Radar dashboard ↗
            </a>
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
