import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useGdacs, useAcled } from "@/hooks/useDataSources";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";

export const GlobalPanel = ({
  acledEmail,
  acledKey,
  refreshMs,
}: {
  acledEmail: string | null;
  acledKey: string | null;
  refreshMs: number;
}) => {
  const gdacs = useGdacs(refreshMs);
  const acled = useAcled(acledEmail, acledKey, refreshMs);

  const disastersActive = gdacs.data?.length ?? null;
  const conflictCount = acled.data?.count ?? null;
  const hasAcled = !!acledKey && !!acledEmail;

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
            value={hasAcled ? conflictLabel(conflictCount) : "Add key"}
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
            value={hasAcled ? (conflictCount?.toLocaleString() ?? "—") : "Add key in Settings"}
            subtle={!hasAcled}
            link={!hasAcled ? "/settings" : undefined}
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
  link,
}: {
  label: string;
  value: string;
  subtle?: boolean;
  tone?: "ok" | "warning" | "critical" | "muted";
  link?: string;
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
      {link ? (
        <Link
          to={link}
          className="font-mono text-xs text-accent hover:underline inline-flex items-center gap-1"
        >
          <SettingsIcon className="h-3 w-3" />
          {value}
        </Link>
      ) : (
        <span className={`font-mono text-sm font-semibold ${subtle ? "text-dim" : toneClass}`}>{value}</span>
      )}
    </div>
  );
};
