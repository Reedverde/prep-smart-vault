import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo, NoDataReason } from "@/components/PanelKit";
import { useCloudflareRadar } from "@/hooks/useDataSources";
import vaultboyYellow from "@/assets/vaultboy-yellow.jpg";
import vaultboyRed from "@/assets/vaultboy-red.jpg";

type StatusLevel = "green" | "yellow" | "red";

const STATUS_LABEL: Record<StatusLevel, string> = {
  green: "OK",
  yellow: "UNSTABLE",
  red: "CRITICAL",
};

const STATUS_BADGE: Record<StatusLevel, string> = {
  green: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  yellow: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  red: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
};

const computeLevel = (deltaPct: number | null, attackLevel: string): StatusLevel => {
  const d = deltaPct != null ? Math.abs(deltaPct) : 0;
  if (d > 30 || attackLevel === "high") return "red";
  if (d > 15 || attackLevel === "medium") return "yellow";
  return "green";
};

const ConfigureNotice = ({ keyName }: { keyName: string }) => (
  <div className="font-mono text-xs text-dim text-center py-6 leading-relaxed">
    Configure <span className="text-foreground">{keyName}</span> in secrets to enable.
  </div>
);

export const InternetHealthPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useCloudflareRadar(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  const level: StatusLevel = data && !notConfigured
    ? computeLevel(data.trafficDeltaPct ?? null, data.attackLevel ?? "low")
    : "green";

  const bgImage = level === "red" ? vaultboyRed : level === "yellow" ? vaultboyYellow : null;

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
      <div className="relative -m-4 p-4 min-h-full">
        {bgImage && (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "right center",
              }}
            />
            <div className="absolute inset-0 pointer-events-none bg-card/75" />
          </>
        )}
        <div className="relative">
          {isLoading ? (
            <PanelSkeleton rows={4} />
          ) : notConfigured ? (
            <ConfigureNotice keyName={(data as any).key || "CLOUDFLARE_RADAR_API_TOKEN"} />
          ) : error || !data ? (
            <NoDataReason error={error} hasData={!!data} onRetry={() => refetch()} />
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
                  className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_BADGE[level]}`}
                >
                  {STATUS_LABEL[level]}
                </span>
              </div>

              {data.trafficDeltaPct != null && (
                <div className="font-mono text-[11px] text-dim leading-relaxed">
                  {data.trafficDeltaPct > 0 ? "+" : ""}{data.trafficDeltaPct.toFixed(1)}% {data.trafficDeltaPct >= 0 ? "more" : "less"} US web traffic than the 7-day baseline.
                  {Math.abs(data.trafficDeltaPct) <= 15
                    ? " Within normal daily variation (±15%)."
                    : " Outside normal range — possible outage or major event."}
                </div>
              )}

              {data.anomalyNote && (
                <div className="font-mono text-[11px] px-2 py-1.5 rounded border border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate">
                  {data.anomalyNote}
                </div>
              )}

              {Array.isArray(data.topTargets) && data.topTargets.length > 0 && (
                <div className="space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-dim inline-flex items-center gap-1">
                    Top attack targets (7d)
                    <InfoTip>Share (%) of global layer-7 DDoS attack traffic targeting each country over the past 7 days. Higher = more attacks aimed at servers in that country.</InfoTip>
                  </div>
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
        </div>
      </div>
    </Panel>
  );
};
