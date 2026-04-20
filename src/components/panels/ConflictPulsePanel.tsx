import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdelt } from "@/hooks/useDataSources";

const conflictLabel = (n: number | null) => {
  if (n === null) return "—";
  if (n > 200) return "HIGH";
  if (n > 100) return "ELEVATED";
  return "NORMAL";
};

const conflictExplanation = (label: string): string | null => {
  if (label === "HIGH") return "Above typical global conflict news volume";
  if (label === "ELEVATED") return "Slightly above typical global conflict news volume";
  if (label === "NORMAL") return "Typical global conflict news volume";
  return null;
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

export const ConflictPulsePanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useGdelt(refreshMs);

  const hasData = !!data;
  const count: number | null = hasData ? (data!.count ?? 0) : null;
  const byRegion: Record<string, number> = hasData ? (data!.byRegion || {}) : {};
  const byType: Record<string, number> = hasData ? (data!.byType || {}) : {};

  const topRegion = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const label = conflictLabel(count);
  const explanation = hasData ? conflictExplanation(label) : null;

  return (
    <Panel
      title="Conflict Pulse"
      source="GDELT"
      sourceUrl="https://www.gdeltproject.org/"
      action={
        <>
          <InfoTip>
            7-day global news coverage of conflict, protest, and violence indexed by GDELT. Thresholds: &gt;200 HIGH · &gt;100 ELEVATED.
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
            {explanation && (
              <div className="font-mono text-[10px] text-dim leading-snug">{explanation}</div>
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

          <ContextBox>
            GDELT scans worldwide news every 15 minutes, classifying coverage of conflict, protest, and violence. Index reflects 7-day article volume.
          </ContextBox>
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
