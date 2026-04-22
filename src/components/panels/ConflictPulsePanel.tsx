import { Panel } from "@/components/Panel";
import { InfoTip, PanelSkeleton, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdelt } from "@/hooks/useDataSources";
import { flagEmoji } from "@/lib/flags";

const conflictLabel = (n: number | null) => {
  if (n === null) return "—";
  if (n > 200) return "HIGH";
  if (n > 100) return "ELEVATED";
  return "NORMAL";
};

const labelTone = (n: number | null) => {
  if (n === null) return "text-dim";
  if (n > 200) return "text-severity-critical";
  if (n > 100) return "text-severity-moderate";
  return "text-severity-low";
};

const labelBorder = (n: number | null) => {
  if (n === null) return "border-dim/40";
  if (n > 200) return "border-severity-critical/50";
  if (n > 100) return "border-severity-moderate/50";
  return "border-severity-low/50";
};

const isOther = (k: string) => k.trim().toLowerCase() === "other";

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

interface Article {
  title: string;
  url: string;
  domain: string;
  country: string;
  seendate: string;
}

export const ConflictPulsePanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useGdelt(refreshMs);

  const hasData = !!data;
  const count: number | null = hasData ? (data!.count ?? 0) : null;
  const byRegion: Record<string, number> = hasData ? (data!.byRegion || {}) : {};
  const byType: Record<string, number> = hasData ? (data!.byType || {}) : {};
  const articles: Article[] = hasData ? ((data as any)!.articles || []) : [];

  const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  const topType = Object.entries(byType)
    .filter(([k]) => !isOther(k))
    .sort((a, b) => b[1] - a[1])[0];
  const label = conflictLabel(count);

  return (
    <Panel
      title="Conflict Pulse"
      source="GDELT"
      sourceUrl="https://www.gdeltproject.org/"
      action={
        <>
          <InfoTip>
            <div className="space-y-2">
              <p>
                <strong>GDELT</strong> monitors broadcast, print, and web news in 100+ languages every 15 minutes, tagging articles by theme, location, and tone.
              </p>
              <p>
                The <strong>Conflict Index</strong> is the 7-day worldwide article count tagged with conflict, protest, or violence themes (CAMEO codes 14–20).
              </p>
              <p>
                <strong>Thresholds:</strong> NORMAL ≤ 100 · ELEVATED 100–200 · HIGH &gt; 200.
              </p>
              <p className="italic">
                Caveat: this measures news <strong>coverage</strong>, not ground-truth severity. A media frenzy can spike the index even without proportional escalation.
              </p>
            </div>
          </InfoTip>
          <RefreshButton onClick={() => refetch()} loading={isFetching} />
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col items-start gap-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Conflict Index</div>
            <span
              className={`font-mono text-2xl font-semibold px-3 py-1 rounded border ${labelTone(count)} ${labelBorder(count)}`}
            >
              {label}
            </span>
            {hasData && count !== null && (
              <div className="font-mono text-[10px] text-dim leading-snug">
                Based on 7d article volume: {count.toLocaleString()} articles
              </div>
            )}
          </div>

          <Row
            label="Conflict articles (7d)"
            value={hasData ? (count?.toLocaleString() ?? "—") : "—"}
          />
          {hasData && topRegion && (
            <Row label={`Top region · ${topRegion[0]}`} value={topRegion[1].toLocaleString()} />
          )}
          {hasData && topType && (
            <Row label={`Top theme · ${topType[0]}`} value={topType[1].toLocaleString()} />
          )}

          {articles.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim">
                Top conflict stories
              </div>
              <div className="space-y-1">
                {articles.map((a, i) => {
                  const flag = flagEmoji(a.country);
                  return (
                    <a
                      key={`${a.domain}-${i}`}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block py-1 px-1 -mx-1 rounded hover:bg-secondary/40 transition-colors"
                    >
                      <div className="font-mono text-[11px] text-foreground leading-snug line-clamp-2">
                        {flag && <span className="mr-1">{flag}</span>}
                        {a.title}
                      </div>
                      <div className="font-mono text-[10px] text-dim mt-0.5 truncate">
                        {a.domain || "source"} · {timeAgo(a.seendate)}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
    <span className="font-mono text-[10px] uppercase tracking-wider text-dim truncate">{label}</span>
    <span className="font-mono text-sm font-semibold text-foreground shrink-0">{value}</span>
  </div>
);
