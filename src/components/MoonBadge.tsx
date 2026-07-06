// Moon phase badge: monochrome SVG disc with geometrically correct lit fraction,
// rendered on the same Pip-Boy dotted grid as WeatherIcon.

import { useId } from "react";

import { getMoonPhase } from "@/lib/moonPhase";

export const MoonBadge = ({
  size = 40,
  withGrid = true,
  className,
  date,
}: {
  size?: number;
  withGrid?: boolean;
  className?: string;
  date?: Date;
}) => {
  const { phase, name, illumination, waxing } = getMoonPhase(date);
  const r = 22;
  const cx = 32;
  const cy = 32;

  // Build the lit shape as a path: outer half-circle + inner ellipse arc (terminator).
  // Phase fraction f = illumination / 100. The terminator x-radius scales with cos.
  const f = illumination / 100;
  const ellipseRx = Math.abs(2 * f - 1) * r;

  const uid = useId().replace(/:/g, "");
  const gridId = `moongrid${uid}`;
  const clipId = `moonclip${uid}`;
  const maskId = `moonmask${uid}`;
  const sideX = waxing ? cx : cx - r;

  let litShape = null;
  if (f >= 0.999) {
    litShape = <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity="0.85" stroke="none" />;
  } else if (f > 0.5) {
    litShape = (
      <g clipPath={`url(#${clipId})`}>
        <rect x={sideX} y={cy - r} width={r} height={r * 2} fill="currentColor" fillOpacity="0.85" />
        <ellipse cx={cx} cy={cy} rx={ellipseRx} ry={r} fill="currentColor" fillOpacity="0.85" />
      </g>
    );
  } else if (f > 0.001) {
    litShape = (
      <g clipPath={`url(#${clipId})`} mask={`url(#${maskId})`}>
        <rect x={sideX} y={cy - r} width={r} height={r * 2} fill="currentColor" fillOpacity="0.85" />
      </g>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        stroke="currentColor"
        fill="none"
        aria-hidden
        style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
      >
        <defs>
          {withGrid && (
              <pattern id={gridId} width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.18" />
              </pattern>
          )}
          <clipPath id={clipId}>
            <circle cx={cx} cy={cy} r={r} />
          </clipPath>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
            <rect x="0" y="0" width="64" height="64" fill="white" />
            <ellipse cx={cx} cy={cy} rx={ellipseRx} ry={r} fill="black" />
          </mask>
        </defs>
        {withGrid && (
            <rect
              x="1"
              y="1"
              width="62"
              height="62"
              fill={`url(#${gridId})`}
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="1"
              rx="3"
            />
        )}
        {/* Disc outline */}
        <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
        {/* Lit fraction filled */}
        {litShape}
      </svg>
      <div className="leading-tight">
        <div className="font-mono text-[10px] uppercase tracking-wider text-foreground">
          {name}
        </div>
        <div className="font-mono text-[10px] text-dim tabular-nums">
          {illumination}% lit
        </div>
      </div>
    </div>
  );
};
