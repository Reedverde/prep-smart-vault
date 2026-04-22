import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
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

// Top ~40 countries GDELT commonly returns. Unknown → no flag.
const COUNTRY_TO_ISO2: Record<string, string> = {
  "united states": "US", "usa": "US", "united kingdom": "GB", "uk": "GB",
  "canada": "CA", "australia": "AU", "new zealand": "NZ", "ireland": "IE",
  "france": "FR", "germany": "DE", "italy": "IT", "spain": "ES", "portugal": "PT",
  "netherlands": "NL", "belgium": "BE", "switzerland": "CH", "austria": "AT",
  "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI", "poland": "PL",
  "ukraine": "UA", "russia": "RU", "belarus": "BY", "turkey": "TR", "greece": "GR",
  "israel": "IL", "palestine": "PS", "iran": "IR", "iraq": "IQ", "syria": "SY",
  "lebanon": "LB", "saudi arabia": "SA", "egypt": "EG", "south africa": "ZA",
  "nigeria": "NG", "kenya": "KE", "ethiopia": "ET", "sudan": "SD",
  "china": "CN", "japan": "JP", "south korea": "KR", "north korea": "KP",
  "india": "IN", "pakistan": "PK", "bangladesh": "BD", "afghanistan": "AF",
  "indonesia": "ID", "philippines": "PH", "vietnam": "VN", "thailand": "TH",
  "malaysia": "MY", "singapore": "SG", "taiwan": "TW", "hong kong": "HK",
  "mexico": "MX", "brazil": "BR", "argentina": "AR", "chile": "CL",
  "colombia": "CO", "venezuela": "VE", "peru": "PE",
};

const flagEmoji = (country: string): string => {
  const iso = COUNTRY_TO_ISO2[country.toLowerCase().trim()];
  if (!iso) return "";
  const codePoints = iso.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
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
        <PanelError message="Could not load global headlines" onRetry={() => refetch()} />
      ) : visible.length === 0 ? (
        <div className="font-mono text-xs text-dim py-4 text-center">No recent headlines</div>
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
