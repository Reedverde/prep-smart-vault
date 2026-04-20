import { useEffect, useRef } from "react";
import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useNewsFeed } from "@/hooks/useDataSources";

const sourceStyle: Record<string, string> = {
  nws: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
  usgs: "border-severity-severe/40 bg-severity-severe/15 text-severity-severe",
  cisa: "border-accent/40 bg-accent/15 text-accent",
  reliefweb: "border-primary/40 bg-primary/15 text-primary",
  newsapi: "border-border bg-inset text-dim",
};

const sourceLabel: Record<string, string> = {
  nws: "NWS",
  usgs: "USGS",
  cisa: "CISA",
  reliefweb: "RELIEF",
  newsapi: "NEWS",
};

const sourceAttribution: Record<string, string> = {
  newsapi: "NewsAPI",
  nws: "NWS",
  usgs: "USGS",
  cisa: "CISA",
  reliefweb: "ReliefWeb",
};
const SOURCE_ORDER = ["newsapi", "nws", "usgs", "cisa", "reliefweb"] as const;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export const NewsPanel = ({ state, refreshMs }: { state: string | null; refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useNewsFeed(state, refreshMs);
  const notConfigured = data && (data as any).notConfigured;
  const items = !notConfigured && data?.items ? data.items : [];
  const sourceCounts: Record<string, number> | undefined = (data as any)?.sourceCounts;
  const sourceErrors: Record<string, string> | undefined = (data as any)?.sourceErrors;

  const warnedRef = useRef(false);
  useEffect(() => {
    if (!sourceCounts || warnedRef.current) return;
    const dead = SOURCE_ORDER.filter((k) => (sourceCounts[k] ?? 0) === 0);
    if (dead.length) {
      console.warn(
        "[NewsPanel] sources returning 0 items:",
        dead.map((k) => `${k}${sourceErrors?.[k] ? ` (${sourceErrors[k]})` : ""}`).join(", "),
      );
      warnedRef.current = true;
    }
  }, [sourceCounts, sourceErrors]);

  const liveAttribution = sourceCounts
    ? SOURCE_ORDER.filter((k) => (sourceCounts[k] ?? 0) > 0)
        .map((k) => sourceAttribution[k])
        .join(" · ") || "No sources reporting"
    : "NewsAPI · NWS · USGS · CISA · ReliefWeb";

  return (
    <Panel
      title="News & Advisories"
      source={liveAttribution}
      action={
        <>
          <InfoTip>Top US headlines combined with NWS state alerts, USGS M4.5+ quakes, CISA advisories, and ReliefWeb disasters.</InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={6} />
      ) : notConfigured ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <p className="font-mono text-xs text-dim max-w-xs leading-relaxed">
            Not configured — contact administrator.
          </p>
        </div>
      ) : error ? (
        <PanelError message="Could not load news feed" onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <div className="font-mono text-xs text-dim py-4 text-center">No recent items</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 py-1.5 border-b border-border/40 last:border-0 hover:bg-inset/50 transition-colors rounded px-1 -mx-1"
            >
              <span
                className={`shrink-0 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  sourceStyle[item.source] || sourceStyle.newsapi
                }`}
              >
                {sourceLabel[item.source] || "NEWS"}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-dim tabular-nums w-8">
                {timeAgo(item.publishedAt)}
              </span>
              <span className="font-mono text-xs text-foreground leading-snug line-clamp-2">
                {item.title}
              </span>
            </a>
          ))}
          <ContextBox>
            Aggregated and deduplicated across sources. Click any headline to open the original report.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
