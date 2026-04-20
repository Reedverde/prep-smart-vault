import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdacs, useAcled } from "@/hooks/useDataSources";

export const GlobalPanel = ({ refreshMs }: { refreshMs: number }) => {
  const gdacs = useGdacs(refreshMs);
  const acled = useAcled(refreshMs);

  const disastersActive = gdacs.data?.length ?? null;
  const acledNotConfigured = acled.data && typeof acled.data === "object" && (acled.data as any).notConfigured;
  const conflictCount = acledNotConfigured ? null : (acled.data?.count ?? null);
  const hasAcled = !acledNotConfigured;

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
          <InfoTip>Global conflict events (ACLED), active disasters (GDACS), and internet shutdowns. Compared against 90-day baseline.</InfoTip>
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
            value={hasAcled ? conflictLabel(conflictCount) : "Not configured"}
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
            value={hasAcled ? (conflictCount?.toLocaleString() ?? "—") : "Contact admin"}
            subtle={!hasAcled}
          />
          <Row
            label="Major disasters active"
            value={disastersActive !== null ? String(disastersActive) : (gdacs.error ? "—" : "Loading…")}
            tone={disastersActive && disastersActive > 5 ? "warning" : "ok"}
          />
          <Row label="Internet shutdowns" value="Manual tracking" subtle />

          <ContextBox>
            ACLED tracks conflict events globally. GDACS tracks active major natural disasters. Numbers compared against 90-day baseline.
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
      <span className="font-mono text-[10px] uppercase tracking-wider text-dim">{label}</span>
      <span className={`font-mono text-sm font-semibold ${subtle ? "text-dim" : toneClass}`}>{value}</span>
    </div>
  );
};
