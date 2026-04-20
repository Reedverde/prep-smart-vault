import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useNasa } from "@/hooks/useDataSources";

export const NasaPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useNasa(refreshMs);
  const notConfigured = data && (data as any).notConfigured;

  const flares = data?.donki?.flares ?? [];
  const cmes = data?.donki?.cmes ?? [];
  const neo = data?.neo ?? [];

  const strongestFlare = flares.reduce((best: any, f: any) => {
    if (!best) return f;
    return (f.classType || "").localeCompare(best.classType || "") > 0 ? f : best;
  }, null);

  const flareTone = (cls?: string) => {
    if (!cls) return "text-dim";
    if (cls.startsWith("X")) return "text-severity-critical";
    if (cls.startsWith("M")) return "text-severity-severe";
    if (cls.startsWith("C")) return "text-severity-moderate";
    return "text-severity-low";
  };

  return (
    <Panel
      title="NASA Space"
      source="NASA DONKI · NEO"
      sourceUrl="https://api.nasa.gov/"
      action={
        <>
          <InfoTip>Solar flares + CMEs from DONKI (last 7d), and near-Earth asteroid close approaches this week.</InfoTip>
          {!notConfigured && <RefreshButton onClick={() => refetch()} loading={isFetching} />}
        </>
      }
    >
      {isLoading ? (
        <PanelSkeleton rows={4} />
      ) : notConfigured ? (
        <div className="flex flex-col items-center text-center gap-2 py-6">
          <p className="font-mono text-xs text-dim max-w-xs leading-relaxed">
            Not configured — contact administrator.
          </p>
        </div>
      ) : error || !data ? (
        <PanelError message="Could not load NASA data" onRetry={() => refetch()} />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-inset border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Solar flares (7d)</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">{flares.length}</span>
                {strongestFlare?.classType && (
                  <span className={`font-mono text-xs ${flareTone(strongestFlare.classType)}`}>
                    max {strongestFlare.classType}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-md bg-inset border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">CMEs (7d)</div>
              <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">{cmes.length}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Near-Earth approaches</div>
            {neo.length === 0 ? (
              <div className="font-mono text-xs text-dim py-1">No close approaches this week</div>
            ) : (
              neo.slice(0, 5).map((n: any) => {
                const close = n.missLd < 1;
                return (
                  <div key={n.id} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0 font-mono text-xs">
                    <span className="truncate text-foreground">{n.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-dim tabular-nums">{n.missLd.toFixed(2)} LD</span>
                      {close && (
                        <span className="px-1.5 py-0.5 rounded border border-severity-critical/40 bg-severity-critical/15 text-severity-critical text-[9px] uppercase tracking-wider">
                          CLOSE
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <ContextBox>
            DONKI tracks solar flares (C/M/X class) and CMEs. NEO feed flags asteroids passing within 1 lunar distance (~384,400 km).
          </ContextBox>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
