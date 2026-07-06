// Moon phase badge: monochrome SVG disc with geometrically correct lit fraction,
// rendered on the same Pip-Boy dotted grid as WeatherIcon.

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
  // angle through the cycle: 0..2π
  const t = phase * 2 * Math.PI;
  const ellipseRx = Math.abs(2 * f - 1) * r;

  // Which side is lit
  // waxing: lit on right; waning: lit on left
  // Two sub-shapes:
  //   gibbous (f > 0.5): full disc minus an opposite-side ellipse cap
  //   crescent (f <= 0.5): half-disc minus inner ellipse
  // Easier: paint full disc dim, then overlay lit shape.

  // Lit path
  let litPath = "";
  const litSide = waxing ? 1 : -1; // +1 right, -1 left
  if (f >= 0.999) {
    litPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  } else if (f <= 0.001) {
    litPath = "";
  } else if (f > 0.5) {
    // Gibbous: full disc minus opposite-side ellipse "bite" extending outward from center
    // We render as path with two arcs forming a lens-complement.
    // Outer arc: full circle going around lit side.
    // sweep: outer half on lit side then ellipse arc on the dark side.
    const sweepOuter = waxing ? 0 : 1;
    const sweepInner = waxing ? 0 : 1;
    litPath = `
      M ${cx} ${cy - r}
      A ${r} ${r} 0 0 ${litSide > 0 ? 1 : 0} ${cx} ${cy + r}
      A ${ellipseRx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r}
      Z
    `.replace(/\s+/g, " ");
  } else {
    // Crescent: half-disc on lit side minus inner ellipse
    const sweepOuter = waxing ? 1 : 0;
    const sweepInner = waxing ? 0 : 1;
    litPath = `
      M ${cx} ${cy - r}
      A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r}
      A ${ellipseRx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r}
      Z
    `.replace(/\s+/g, " ");
  }

  const gridId = "moon-grid";

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
        {withGrid && (
          <>
            <defs>
              <pattern id={gridId} width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="currentColor" opacity="0.18" />
              </pattern>
            </defs>
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
          </>
        )}
        {/* Disc outline */}
        <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
        {/* Lit fraction filled */}
        {litPath && <path d={litPath} fill="currentColor" fillOpacity="0.85" stroke="none" />}
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
