// Shared helpers used by /pi and /pi3 so both routes render identical visuals.
// Pure presentational primitives — no data, no timers, no animation.

import type { ReactNode } from "react";

export const Big = ({
  size, color, glow, children,
}: { size: number; color: string; glow?: string; children: ReactNode }) => (
  <span
    className="pi-big"
    style={{
      fontSize: size,
      color,
      textShadow: glow ? `0 0 10px ${glow}` : undefined,
    }}
  >
    {children}
  </span>
);

// Inline moon glyph for the kiosk tile — geometric lit fraction matching MoonBadge.
export const PiMoon = ({
  size = 48, illumination, waxing,
}: { size?: number; illumination: number; waxing: boolean }) => {
  const r = 22, cx = 32, cy = 32;
  const f = illumination / 100;
  const t = (illumination / 100) * Math.PI; // for ellipseRx use cycle angle approx
  // Recompute via phase fraction would need phase; approximate using illumination only:
  const ellipseRx = Math.abs(1 - 2 * f) * r;
  const litSide = waxing ? 1 : -1;
  let d = "";
  if (f >= 0.99) {
    d = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  } else if (f <= 0.01) {
    d = "";
  } else if (f > 0.5) {
    const sweepInner = waxing ? 0 : 1;
    d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${litSide > 0 ? 1 : 0} ${cx} ${cy + r} A ${ellipseRx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r} Z`;
  } else {
    const sweepOuter = waxing ? 1 : 0;
    const sweepInner = waxing ? 0 : 1;
    d = `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r} A ${ellipseRx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r} Z`;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" stroke="currentColor" fill="none" aria-hidden
      style={{ filter: "drop-shadow(0 0 6px currentColor)" }}>
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" />
      {d && <path d={d} fill="currentColor" fillOpacity="0.9" stroke="none" />}
    </svg>
  );
};
