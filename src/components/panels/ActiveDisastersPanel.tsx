import { Panel } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdacs } from "@/hooks/useDataSources";
import { formatDistanceToNow } from "date-fns";

const typeAbbrev: Record<string, string> = {
  EQ: "EQ",
  TC: "TC",
  FL: "FL",
  VO: "VO",
  DR: "DR",
  WF: "WF",
};

const typeLabel: Record<string, string> = {
  EQ: "Earthquake",
  TC: "Tropical cyclone",
  FL: "Flood",
  VO: "Volcano",
  DR: "Drought",
  WF: "Wildfire",
};

const alertPillClass = (level: string) => {
  const l = (level || "").toLowerCase();
  if (l === "red") return "bg-severity-critical/15 text-severity-critical border-severity-critical/40";
  if (l === "orange") return "bg-severity-moderate/15 text-severity-moderate border-severity-moderate/40";
  return "bg-secondary/40 text-dim border-border/60";
};

const safeNum = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmtPop = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
};

const buildDetail = (p: any): string => {
  const parts: string[] = [];
  const type = p?.eventtype;
  const sevVal = safeNum(p?.severitydata?.severity ?? p?.severity?.value ?? p?.severity);
  const ed = p?.severitydata?.eventdetails || p?.severitydata || {};

  if (type === "EQ") {
    if (sevVal !== null) parts.push(`M${sevVal.toFixed(1)}`);
    const depth = safeNum(ed?.depth);
    if (depth !== null) parts.push(`${Math.round(depth)}km depth`);
  } else if (type === "TC") {
    const cat = ed?.Class || ed?.class || ed?.category;
    if (cat) parts.push(`${cat}`);
    const wind = safeNum(ed?.maxwind ?? ed?.wind);
    if (wind !== null) parts.push(`${Math.round(wind)} kt`);
  } else if (type === "FL") {
    const pop = safeNum(p?.population?.value ?? p?.population);
    if (pop !== null && pop > 0) parts.push(`pop ~${fmtPop(pop)} affected`);
  } else if (type === "VO") {
    if (sevVal !== null) parts.push(`VEI ${sevVal}`);
  }

  if (p?.fromdate) {
    try {
      parts.push(`${formatDistanceToNow(new Date(p.fromdate), { addSuffix: false })} ago`);
    } catch {
      // ignore
    }
  }

  return parts.join(" · ");
};

// Decode common HTML entities + strip tags + collapse whitespace.
const stripHtml = (s: string): string => {
  if (!s) return "";
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      try { return String.fromCharCode(parseInt(n, 10)); } catch { return " "; }
    })
    .replace(/\s+/g, " ")
    .trim();
};

const truncate = (s: string, max = 140): string => {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
};

const buildDescription = (p: any): string => {
  const raw =
    p?.htmldescription ||
    p?.description ||
    "";
  const stripped = stripHtml(String(raw));
  if (stripped) return truncate(stripped, 140);
  const t = typeLabel[p?.eventtype];
  return t ? `${t} event` : "";
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
            <div className="space-y-2">
              <p>
                The Global Disaster Alert and Coordination System (UN + EU). Auto-detects major sudden-onset disasters worldwide and issues alerts within minutes — typically before mainstream news.
              </p>
              <p>
                <strong>Alert levels:</strong> GREEN (filtered out) · ORANGE (significant impact likely) · RED (severe, international assistance probable).
              </p>
              <p>
                <strong>Event types:</strong> EQ earthquake · TC tropical cyclone · FL flood · VO volcano · DR drought · WF wildfire.
              </p>
            </div>
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
                const location = p.country || p.name || "Unknown";
                const level = p.alertlevel || "";
                const url = p.url?.report || p.url?.details || `https://www.gdacs.org/`;
                const detail = buildDetail(p);
                const description = buildDescription(p);
                return (
                  <a
                    key={p.eventid ? `${p.eventtype}-${p.eventid}` : i}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 py-1.5 hover:bg-secondary/40 rounded px-1 transition-colors"
                  >
                    <span className="font-mono text-[10px] font-semibold text-dim w-7 shrink-0 mt-0.5">{type}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] text-foreground truncate">{location}</div>
                      {detail && (
                        <div className="font-mono text-[10px] text-dim truncate mt-0.5">{detail}</div>
                      )}
                      {description && (
                        <div className="font-mono text-[10px] text-dim/90 mt-0.5 line-clamp-2 leading-snug">
                          {description}
                        </div>
                      )}
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${alertPillClass(level)}`}
                    >
                      {level || "—"}
                    </span>
                  </a>
                );
              })
            )}
          </div>

          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
