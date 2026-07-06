// Shared helpers used by /pi and /pi3 so both routes render identical visuals.
// Pure presentational primitives — no data, no timers, no animation.

import { useId, type ReactNode } from "react";

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
  const ellipseRx = Math.abs(1 - 2 * f) * r;
  const uid = useId().replace(/:/g, "");
  const clipId = `pimoonclip${uid}`;
  const maskId = `pimoonmask${uid}`;
  const sideX = waxing ? cx : cx - r;
  let litShape = null;

  if (f >= 0.99) {
    litShape = <circle cx={cx} cy={cy} r={r} fill="currentColor" fillOpacity="0.9" stroke="none" />;
  } else if (f > 0.5) {
    litShape = (
      <g clipPath={`url(#${clipId})`}>
        <rect x={sideX} y={cy - r} width={r} height={r * 2} fill="currentColor" fillOpacity="0.9" />
        <ellipse cx={cx} cy={cy} rx={ellipseRx} ry={r} fill="currentColor" fillOpacity="0.9" />
      </g>
    );
  } else if (f > 0.01) {
    litShape = (
      <g clipPath={`url(#${clipId})`} mask={`url(#${maskId})`}>
        <rect x={sideX} y={cy - r} width={r} height={r * 2} fill="currentColor" fillOpacity="0.9" />
      </g>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" stroke="currentColor" fill="none" aria-hidden
      style={{ filter: "drop-shadow(0 0 6px currentColor)" }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect x="0" y="0" width="64" height="64" fill="white" />
          <ellipse cx={cx} cy={cy} rx={ellipseRx} ry={r} fill="black" />
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" />
      {litShape}
    </svg>
  );
};
