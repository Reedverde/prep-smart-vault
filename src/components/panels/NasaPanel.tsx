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

          <div className="rounded-md bg-inset border border-border/60 p-3 max-h-[200px] overflow-y-auto scroll-thin">
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground mb-2">About NASA DONKI + NEO</div>
            <div className="font-mono text-xs text-dim leading-relaxed space-y-2">
              <p>
                <span className="text-foreground">DONKI</span> (Database Of Notifications, Knowledge, Information) is NASA's space-weather event log — the authoritative record of flares, CMEs, and radiation events.
              </p>
              <p>
                <span className="text-foreground">Solar flare classes</span> are logarithmic by X-ray brightness:<br />
                A &lt; B &lt; <span className="text-severity-low">C</span> &lt; <span className="text-severity-severe">M</span> &lt; <span className="text-severity-critical">X</span>.<br />
                Each step = 10× stronger. M-class can cause brief radio blackouts on Earth's sunlit side; X-class can disrupt GPS, HF radio, and satellite operations.
              </p>
              <p>
                <span className="text-foreground">CMEs</span> (Coronal Mass Ejections) are billion-ton plasma eruptions from the Sun. If Earth-directed, they take 1–3 days to arrive and can drive geomagnetic storms — see the Kp index on the Space Weather panel.
              </p>
              <p>
                <span className="text-foreground">NEO</span> = Near-Earth Object. <span className="text-foreground">LD</span> = Lunar Distance (≈384,400 km, the Earth–Moon distance). The <span className="text-severity-critical">CLOSE</span> flag marks passes within 1 LD.
              </p>
              <p className="text-[11px] italic">
                Anything outside 1 LD has zero impact risk on that pass. Even &quot;close&quot; tracked NEOs are catalogued well in advance — surprise impacts come only from undetected smaller objects.
              </p>
            </div>
          </div>
          <UpdatedAgo date={dataUpdatedAt ? new Date(dataUpdatedAt) : undefined} />
        </div>
      )}
    </Panel>
  );
};
