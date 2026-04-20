import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdacs, useAcled } from "@/hooks/useDataSources";

export const GlobalPanel = ({ refreshMs }: { refreshMs: number }) => {
  const gdacs = useGdacs(refreshMs);
  const acled = useAcled(refreshMs);

  const disastersActive = gdacs.data?.length ?? null;
  const acledData: any = acled.data;
  const acledNotConfigured = acledData && acledData.notConfigured;
  const hasAcled = !!acledData && !acledNotConfigured;
  const conflictCount: number | null = hasAcled ? (acledData.count ?? 0) : null;
  const byRegion: Record<string, number> = hasAcled ? (acledData.byRegion || {}) : {};
  const byType: Record<string, number> = hasAcled ? (acledData.byType || {}) : {};

  const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

  const conflictLabel = (n: number | null) => {
    if (n === null) return "—";
    if (n > 2000) return "HIGH";
    if (n > 1000) return "ELEVATED";
    return "NORMAL";
  };

  return (
    <Panel
      title="Global Situation"
      source="ACLED · GDACS"
      sourceUrl="https://www.gdacs.org/"
      action={
        <>
          <InfoTip>Global conflict events (ACLED) + active disasters (GDACS). Last 7 days.</InfoTip>
          <RefreshButton
            onClick={() => {
              gdacs.refetch();
              acled.refetch();
            }}
            loading={gdacs.isFetching || acled.isFetching}
          />
        </>
      }
    >
      {gdacs.isLoading && acled.isLoading ? (
        <PanelSkeleton rows={4} />
      ) : (
        <div className="space-y-3">
          <Row
            label="Conflict Index"
            value={hasAcled ? conflictLabel(conflictCount) : acledNotConfigured ? "Not configured" : "—"}
            subtle={!hasAcled}
            tone={
              !hasAcled
                ? "muted"
                : conflictCount && conflictCount > 2000
                  ? "critical"
                  : conflictCount && conflictCount > 1000
                    ? "warning"
                    : "ok"
            }
          />
          <Row
            label="Conflict events (7d)"
            value={hasAcled ? (conflictCount?.toLocaleString() ?? "—") : acledNotConfigured ? "Contact admin" : "—"}
            subtle={!hasAcled}
          />
          {hasAcled && topRegion && (
            <Row label={`Top region · ${topRegion[0]}`} value={topRegion[1].toLocaleString()} />
          )}
          {hasAcled && topType && (
            <Row label={`Top event · ${topType[0]}`} value={topType[1].toLocaleString()} />
          )}
          <Row
            label="Major disasters active"
            value={disastersActive !== null ? String(disastersActive) : (gdacs.error ? "—" : "Loading…")}
            tone={disastersActive && disastersActive > 5 ? "warning" : "ok"}
          />

          <ContextBox>
            ACLED tracks conflict events globally. GDACS tracks active major natural disasters. 7-day totals.
          </ContextBox>
          <UpdatedAgo date={gdacs.dataUpdatedAt ? new Date(gdacs.dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};

const Row = ({
  label,
  value,
  subtle,
  tone,
}: {
  label: string;
  value: string;
  subtle?: boolean;
  tone?: "ok" | "warning" | "critical" | "muted";
}) => {
  const toneClass = {
    ok: "text-foreground",
    warning: "text-severity-moderate",
    critical: "text-severity-critical",
    muted: "text-dim",
  }[tone || "ok"];

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-dim truncate">{label}</span>
      <span className={`font-mono text-sm font-semibold shrink-0 ${subtle ? "text-dim" : toneClass}`}>{value}</span>
    </div>
  );
};
