import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdacs, useGdelt } from "@/hooks/useDataSources";

export const GlobalPanel = ({ refreshMs }: { refreshMs: number }) => {
  const gdacs = useGdacs(refreshMs);
  const gdelt = useGdelt(refreshMs);

  const disastersActive = gdacs.data?.length ?? null;
  const gdeltData: any = gdelt.data;
  const hasGdelt = !!gdeltData;
  const conflictCount: number | null = hasGdelt ? (gdeltData.count ?? 0) : null;
  const byRegion: Record<string, number> = hasGdelt ? (gdeltData.byRegion || {}) : {};
  const byType: Record<string, number> = hasGdelt ? (gdeltData.byType || {}) : {};

  const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

  // PROVISIONAL thresholds — guessed from initial GDELT volume.
  // Revisit after observing real baseline for ~1 week.
  const conflictLabel = (n: number | null) => {
    if (n === null) return "—";
    if (n > 200) return "HIGH";
    if (n > 100) return "ELEVATED";
    return "NORMAL";
  };

  return (
    <Panel
      title="Global Situation"
      source="GDELT · GDACS"
      sourceUrl="https://www.gdeltproject.org/"
      action={
        <>
          <InfoTip>Global conflict/protest news coverage (GDELT) + active disasters (GDACS). Last 7 days.</InfoTip>
          <RefreshButton
            onClick={() => {
              gdacs.refetch();
              gdelt.refetch();
            }}
            loading={gdacs.isFetching || gdelt.isFetching}
          />
        </>
      }
    >
      {gdacs.isLoading && gdelt.isLoading ? (
        <PanelSkeleton rows={4} />
      ) : (
        <div className="space-y-3">
          <Row
            label="Conflict Index"
            value={hasGdelt ? conflictLabel(conflictCount) : "—"}
            subtle={!hasGdelt}
            tone={
              !hasGdelt
                ? "muted"
                : // PROVISIONAL thresholds — revisit after observing baseline
                  conflictCount && conflictCount > 200
                  ? "critical"
                  : conflictCount && conflictCount > 100
                    ? "warning"
                    : "ok"
            }
          />
          <Row
            label="Conflict articles (7d)"
            value={hasGdelt ? (conflictCount?.toLocaleString() ?? "—") : "—"}
            subtle={!hasGdelt}
          />
          {hasGdelt && topRegion && (
            <Row label={`Top region · ${topRegion[0]}`} value={topRegion[1].toLocaleString()} />
          )}
          {hasGdelt && topType && (
            <Row label={`Top theme · ${topType[0]}`} value={topType[1].toLocaleString()} />
          )}
          <Row
            label="Major disasters active"
            value={disastersActive !== null ? String(disastersActive) : (gdacs.error ? "—" : "Loading…")}
            tone={disastersActive && disastersActive > 5 ? "warning" : "ok"}
          />

          <ContextBox>
            GDELT tracks global news coverage of conflict, protest, and violence. GDACS tracks active major natural disasters. 7-day totals.
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
