import { useMemo } from "react";
import { format } from "date-fns";
import { Panel, ContextBox } from "@/components/Panel";
import { InfoTip } from "@/components/PanelKit";
import { MoonBadge } from "@/components/MoonBadge";
import { getMoonPhase } from "@/lib/moonPhase";
import { getMoonTimes, getNextPhase } from "@/lib/moonTimes";

export const MoonPhasePanel = ({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) => {
  const { times, phase, nextFull, nextNew } = useMemo(() => {
    const now = new Date();
    return {
      times: getMoonTimes(now, lat, lng),
      phase: getMoonPhase(now),
      nextFull: getNextPhase(0.5, now),
      nextNew: getNextPhase(0, now),
    };
  }, [lat, lng]);

  const fmt = (d: Date | null) => (d ? format(d, "h:mm a") : "—");
  const daysTo = (d: Date) =>
    Math.max(0, Math.round((d.getTime() - Date.now()) / 86400000));

  return (
    <Panel
      title="Moon Phase"
      source="Local · Meeus"
      action={
        <InfoTip>
          Geocentric phase + altitude-based rise/set computed locally. No
          network call. ±2 min accuracy.
        </InfoTip>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Top: large badge */}
        <div className="flex items-center justify-center text-accent py-2">
          <MoonBadge size={96} withGrid />
        </div>

        {/* Rise / Set */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-inset border border-border/60 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">
              Moonrise
            </div>
            <div className="font-mono text-base text-foreground tabular-nums">
              {times.alwaysUp
                ? "Always up"
                : times.alwaysDown
                ? "Below horizon"
                : fmt(times.rise)}
            </div>
          </div>
          <div className="rounded-md bg-inset border border-border/60 p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">
              Moonset
            </div>
            <div className="font-mono text-base text-foreground tabular-nums">
              {times.alwaysUp || times.alwaysDown ? "—" : fmt(times.set)}
            </div>
          </div>
        </div>

        {/* Next phases */}
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
          <div className="text-dim">
            Next full ·{" "}
            <span className="text-foreground tabular-nums">
              {daysTo(nextFull)}d
            </span>
          </div>
          <div className="text-dim text-right">
            Next new ·{" "}
            <span className="text-foreground tabular-nums">
              {daysTo(nextNew)}d
            </span>
          </div>
        </div>

        <ContextBox>
          {phase.name} · {phase.illumination}% illuminated ·{" "}
          {phase.waxing ? "waxing (lit on right)" : "waning (lit on left)"}.
        </ContextBox>
      </div>
    </Panel>
  );
};
