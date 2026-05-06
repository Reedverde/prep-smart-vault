import { useState, useMemo } from "react";
import { Panel } from "@/components/Panel";
import { InfoTip, PanelSkeleton, PanelError, RefreshButton, UpdatedAgo } from "@/components/PanelKit";
import { useNasa } from "@/hooks/useDataSources";

const LD_KM = 384400;

type Tone = "low" | "moderate" | "severe" | "critical";

const toneClass: Record<Tone, string> = {
  low: "text-severity-low",
  moderate: "text-severity-moderate",
  severe: "text-severity-severe",
  critical: "text-severity-critical",
};

const formatKm = (km: number) => {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}M km`;
  if (km >= 1_000) return `${Math.round(km / 1_000).toLocaleString()},000 km`.replace(",000,000 km", "M km");
  return `${Math.round(km).toLocaleString()} km`;
};

const kmFromLd = (ld: number) => {
  const km = ld * LD_KM;
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}M km`;
  return `${Math.round(km / 1000).toLocaleString()}k km`;
};

export const NasaPanel = ({ refreshMs }: { refreshMs: number }) => {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useNasa(refreshMs);
  const notConfigured = data && (data as any).notConfigured;
  const [sunFailed, setSunFailed] = useState(false);
  const sunBucket = useMemo(() => Math.floor(Date.now() / (10 * 60 * 1000)), [dataUpdatedAt]);
  const sunSrc = `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg?b=${sunBucket}`;

  const flares = data?.donki?.flares ?? [];
  const cmes = data?.donki?.cmes ?? [];
  const neo = data?.neo ?? [];

  const strongestFlare = flares.reduce((best: any, f: any) => {
    if (!best) return f;
    return (f.classType || "").localeCompare(best.classType || "") > 0 ? f : best;
  }, null);

  const flareTone = (cls?: string): Tone => {
    if (!cls) return "low";
    if (cls.startsWith("X")) return "critical";
    if (cls.startsWith("M")) return "severe";
    if (cls.startsWith("C")) return "moderate";
    return "low";
  };

  // --- Verdicts ---
  const flareVerdict = (() => {
    const cls = strongestFlare?.classType;
    if (!cls || cls.startsWith("A") || cls.startsWith("B")) {
      return { tone: "low" as Tone, label: "quiet", detail: "no flares above background" };
    }
    if (cls.startsWith("C")) return { tone: "low" as Tone, label: "background", detail: `peak ${cls} — no impacts` };
    if (cls.startsWith("M")) return { tone: "severe" as Tone, label: "moderate", detail: `peak ${cls} — possible brief radio blackouts` };
    if (cls.startsWith("X")) return { tone: "critical" as Tone, label: "strong", detail: `peak ${cls} — GPS/HF radio disruption likely` };
    return { tone: "low" as Tone, label: "quiet", detail: "no flares above background" };
  })();

  const cmeVerdict = (() => {
    const n = cmes.length;
    if (n <= 10) return { tone: "low" as Tone, label: "low", detail: `${n} this week` };
    if (n <= 25) return { tone: "low" as Tone, label: "typical", detail: `${n} this week` };
    return { tone: "moderate" as Tone, label: "elevated", detail: `${n} this week — watch Kp if Earth-directed` };
  })();

  const closestNeo = neo.reduce((min: any, n: any) => (!min || n.missLd < min.missLd ? n : min), null);
  const neoVerdict = (() => {
    if (!closestNeo) return { tone: "low" as Tone, label: "none tracked", detail: "no close approaches this week" };
    const ld = closestNeo.missLd;
    const kmLabel = kmFromLd(ld);
    if (ld > 5) return { tone: "low" as Tone, label: "none close", detail: `closest ${ld.toFixed(2)} LD (~${kmLabel})` };
    if (ld >= 1) return { tone: "low" as Tone, label: "routine", detail: `closest ${ld.toFixed(2)} LD (~${kmLabel}), well outside Moon` };
    if (ld >= 0.05) return { tone: "moderate" as Tone, label: "inside lunar orbit", detail: `closest ${ld.toFixed(2)} LD (~${kmLabel}), tracked, no risk` };
    return { tone: "critical" as Tone, label: "very close", detail: `closest ${ld.toFixed(3)} LD (~${kmLabel}), within geosync altitude` };
  })();

  const neoBadge = (ld: number) => {
    if (ld < 0.05) {
      return (
        <span className="px-1.5 py-0.5 rounded border border-severity-critical/40 bg-severity-critical/15 text-severity-critical text-[9px] uppercase tracking-wider">
          VERY CLOSE
        </span>
      );
    }
    if (ld < 1) {
      return (
        <span className="px-1.5 py-0.5 rounded border border-severity-moderate/40 bg-severity-moderate/15 text-severity-moderate text-[9px] uppercase tracking-wider">
          INSIDE LUNAR
        </span>
      );
    }
    return null;
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
          {/* Today's Read — verdict block */}
          <div className="rounded-md bg-inset border border-border/60 p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-foreground mb-2">Today's Read</div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="text-dim w-20 shrink-0">☀ Sun:</span>
                    <span className={`${toneClass[flareVerdict.tone]} font-semibold`}>{flareVerdict.label}</span>
                    <span className="text-dim truncate">· {flareVerdict.detail}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-dim w-20 shrink-0">🌬 CMEs:</span>
                    <span className={`${toneClass[cmeVerdict.tone]} font-semibold`}>{cmeVerdict.label}</span>
                    <span className="text-dim truncate">· {cmeVerdict.detail}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-dim w-20 shrink-0">☄ Asteroids:</span>
                    <span className={`${toneClass[neoVerdict.tone]} font-semibold`}>{neoVerdict.label}</span>
                    <span className="text-dim truncate">· {neoVerdict.detail}</span>
                  </div>
                </div>
              </div>
              {!sunFailed && (
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <img
                    src={sunSrc}
                    alt="Live image of the Sun, NASA SDO 193 Ångström channel"
                    width={80}
                    height={80}
                    onError={() => setSunFailed(true)}
                    className="rounded-full border border-border/60 bg-inset"
                    style={{ width: 80, height: 80, objectFit: "cover" }}
                  />
                  <div className="font-mono text-[9px] uppercase tracking-wider text-dim">
                    SDO · 193Å
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-inset border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">Solar flares (7d)</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">{flares.length}</span>
                {strongestFlare?.classType ? (
                  <span className={`font-mono text-xs ${toneClass[flareTone(strongestFlare.classType)]}`}>
                    max {strongestFlare.classType}
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-dim">background only</span>
                )}
              </div>
            </div>
            <div className="rounded-md bg-inset border border-border/60 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">CMEs (7d)</div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">{cmes.length}</span>
                <span className={`font-mono text-[10px] ${toneClass[cmeVerdict.tone]}`}>{cmeVerdict.label}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim">Closest passes this week</div>
            {neo.length === 0 ? (
              <div className="font-mono text-xs text-dim py-1">No close approaches this week</div>
            ) : (
              neo.slice(0, 5).map((n: any) => {
                const badge = neoBadge(n.missLd);
                const distant = n.missLd > 5;
                return (
                  <div key={n.id} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0 font-mono text-xs">
                    <span className={`truncate ${distant ? "text-dim" : "text-foreground"}`}>{n.name}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-dim tabular-nums">
                        {n.missLd.toFixed(2)} LD · {kmFromLd(n.missLd)}
                      </span>
                      {badge}
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
                <span className="text-foreground">NEO</span> = Near-Earth Object. <span className="text-foreground">LD</span> = Lunar Distance (≈384,400 km, the Earth–Moon distance). Badges: <span className="text-severity-moderate">INSIDE LUNAR</span> = closer than the Moon but tracked & safe; <span className="text-severity-critical">VERY CLOSE</span> = within geosynchronous-satellite altitude (&lt;0.05 LD ≈ 20,000 km).
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
