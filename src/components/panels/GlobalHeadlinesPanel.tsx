import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo, NoDataReason } from "@/components/PanelKit";
import { useGdeltHeadlines } from "@/hooks/useDataSources";
import { flagEmoji } from "@/lib/flags";

type Tag =
  | "CYBER"
  | "COUP"
  | "INVASION"
  | "CONFLICT"
  | "VIOLENCE"
  | "POLITICAL"
  | "PROTEST"
  | "UNREST"
  | "DISASTER"
  | "ECONOMIC"
  | "OTHER";

interface Headline {
  tag: Tag;
  title: string;
  url: string;
  country: string;
  domain: string;
  seendate: string;
}

const tagStyle: Record<Tag, string> = {
  CYBER: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
  COUP: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
  INVASION: "border-severity-critical/40 bg-severity-critical/15 text-severity-critical",
  CONFLICT: "border-severity-severe/40 bg-severity-severe/15 text-severity-severe",
  VIOLENCE: "border-severity-severe/40 bg-severity-severe/15 text-severity-severe",
  POLITICAL: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  PROTEST: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  UNREST: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  DISASTER: "border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate",
  ECONOMIC: "border-severity-low/40 bg-severity-low/15 text-severity-low",
  OTHER: "border-border bg-inset text-dim",
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

const isLikelyEnglish = (title: string): boolean => {
  if (!title) return false;
  const nonAscii = title.replace(/[\x00-\x7F]/g, "").length;
  return nonAscii / title.length <= 0.3;
};

export const GlobalHeadlinesPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useGdeltHeadlines(refreshMs);
  const items: Headline[] = (data as any)?.items || [];
  const visible = items.filter((h) => isLikelyEnglish(h.title));

  return (
    <Panel
      title="Global Headlines"
      source="GDELT · last 6h"
      sourceUrl="https://www.gdeltproject.org/"
      action={
        <>
          <InfoTip>
            Top global headlines from GDELT covering unrest, conflict, cyberattacks, coups, invasions, and major escalations. Last 6 hours, English only, deduplicated across outlets.
          </InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={6} />
      ) : error ? (
        <NoDataReason error={error} onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <NoDataReason hasData={false} onRetry={() => refetch()} />
      ) : (
        <div className="space-y-2">
          <div className="max-h-[640px] overflow-y-auto pr-1 -mr-1 scroll-thin space-y-2">
            {visible.map((item, i) => {
              const flag = flagEmoji(item.country);
              return (
                <a
                  key={`${item.domain}-${i}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block py-1.5 border-b border-border/40 last:border-0 hover:bg-inset/50 transition-colors rounded px-1 -mx-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`shrink-0 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${tagStyle[item.tag]}`}
                    >
                      {item.tag}
                    </span>
                    <span className="font-mono text-[10px] text-dim truncate flex-1">
                      {flag && <span className="mr-1">{flag}</span>}
                      {item.country || item.domain}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-dim tabular-nums">
                      {timeAgo(item.seendate)}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-foreground leading-snug line-clamp-2">
                    {item.title}
                  </div>
                </a>
              );
            })}
          </div>
          <ContextBox>
            Aggregated from GDELT global news monitoring. Click any headline to open the original report.
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
