// PiViz — kiosk-sized inline-SVG / CSS visualizations for /pi tiles.
// All colors flow from --pi-* CSS vars set on .pi-root. Pi 3 safe (no canvas, no JS animations).

import type { ReactNode } from "react";

export const PI_COLORS = {
  GREEN: "var(--green)",
  YELLOW: "var(--yellow)",
  ORANGE: "var(--orange)",
  RED: "var(--red)",
  PURPLE: "var(--purple)",
  BLUE: "var(--blue)",
  DIM: "var(--dim)",
  FAINT: "var(--faint)",
  // Back-compat aliases (older callsites used AMBER)
  AMBER: "var(--yellow)",
};

type Sev = "green" | "yellow" | "orange" | "red" | "purple" | "blue";
const sevVar = (s: Sev) => `var(--${s})`;
const sevGlow = (s: Sev) => `var(--${s}-glow)`;

// ============ PiWeatherIcon — sun/cloud, gradient yellow→orange ============
export const PiWeatherIcon = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
    <defs>
      <radialGradient id="piwx-sun" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffd84d" />
        <stop offset="100%" stopColor="#ff9d3a" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="9" fill="url(#piwx-sun)" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const rad = (a * Math.PI) / 180;
      const x1 = 24 + Math.cos(rad) * 14;
      const y1 = 24 + Math.sin(rad) * 14;
      const x2 = 24 + Math.cos(rad) * 19;
      const y2 = 24 + Math.sin(rad) * 19;
      return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffd84d" strokeWidth={2} strokeLinecap="round" />;
    })}
  </svg>
);

// ============ PiShield — phosphor shield ============
export const PiShield = ({ size = 56, count, color = PI_COLORS.GREEN }: { size?: number; count?: number | string; color?: string }) => (
  <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden>
      <path
        d="M28 4 L50 12 L50 28 C50 40 40 49 28 52 C16 49 6 40 6 28 L6 12 Z"
        fill="none"
        stroke={color}
        strokeWidth={3.5}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
    {count != null && (
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Orbitron, sans-serif", fontWeight: 800, fontSize: size * 0.4,
          color, textShadow: `0 0 8px ${color}`,
        }}
      >
        {count}
      </div>
    )}
  </div>
);

// ============ PiHalfRing — speedometer 110×60 with EPA zones + needle ============
export const PiHalfRing = ({
  value,
  min = 0,
  max = 300,
  zones,
  width = 110,
  height = 60,
  label,
}: {
  value: number | null | undefined;
  min?: number;
  max?: number;
  zones: { from: number; to: number; color: string }[];
  width?: number;
  height?: number;
  label?: string;
}) => {
  const cx = width / 2;
  const cy = height - 6;
  const r = Math.min(width / 2 - 6, height - 10);
  const stroke = 11;
  const v2a = (v: number) =>
    180 + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 180;
  const polar = (deg: number, rad: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arc = (s: number, e: number, rad: number) => {
    const [x1, y1] = polar(s, rad);
    const [x2, y2] = polar(e, rad);
    return `M ${x1} ${y1} A ${rad} ${rad} 0 0 1 ${x2} ${y2}`;
  };
  const needleAngle = value != null ? v2a(value) : v2a(min);
  const [nx, ny] = polar(needleAngle, r - 4);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        {/* Background track */}
        <path d={arc(180, 360, r)} stroke="var(--chrome-2)" strokeWidth={stroke} fill="none" strokeLinecap="round" />
        {zones.map((z, i) => (
          <path
            key={i}
            d={arc(v2a(z.from), v2a(z.to), r)}
            stroke={z.color}
            strokeWidth={stroke}
            fill="none"
            opacity={0.85}
            strokeLinecap="round"
          />
        ))}
        {value != null && (
          <>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={4.5} fill="var(--text)" />
          </>
        )}
      </svg>
      {value != null && (
        <div style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: 26, color: "var(--text)", lineHeight: 1 }}>
          {Math.round(value)}
        </div>
      )}
      {label && <div className="pi-pill pi-c-green" style={{ marginTop: 1 }}>{label}</div>}
    </div>
  );
};

// ============ PiRadarSweep — pure CSS conic-gradient sweep ============
export const PiRadarSweep = () => (
  <div className="pi-radar" aria-hidden>
    <div className="pi-radar-cross" />
    <div className="pi-radar-sweep" />
    <div className="pi-radar-center" />
  </div>
);

// ============ PiHazardTriangle ============
export const PiHazardTriangle = ({ size = 56, color = PI_COLORS.YELLOW }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden>
    <path
      d="M28 6 L52 50 L4 50 Z"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    />
    <rect x="26.5" y="20" width="3" height="16" fill={color} />
    <circle cx="28" cy="42" r="2" fill={color} />
  </svg>
);

// ============ PiGradBar — green→yellow→red horizontal bar with optional redline ============
export const PiGradBar = ({
  pct,
  width = 120,
  height = 10,
  redlinePct,
}: {
  pct: number | null | undefined;
  width?: number;
  height?: number;
  redlinePct?: number;
}) => {
  const p = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{
          position: "absolute", inset: 0,
          background:
            "repeating-linear-gradient(135deg, transparent 0 4px, rgba(0,0,0,0.25) 4px 6px), linear-gradient(90deg, var(--green) 0%, var(--yellow) 60%, var(--red) 100%)",
          opacity: 0.35,
          border: "1px solid var(--chrome-2)",
        }}
      />
      <div
        style={{
          position: "absolute", top: 0, left: 0, height: "100%", width: `${p}%`,
          background: "linear-gradient(90deg, var(--green) 0%, var(--yellow) 60%, var(--red) 100%)",
          backgroundSize: `${(width / Math.max(p, 1)) * 100}% 100%`,
        }}
      />
      {redlinePct != null && (
        <div
          style={{
            position: "absolute", top: -2, bottom: -2,
            left: `${redlinePct}%`, width: 2,
            background: "var(--red)", boxShadow: "0 0 4px var(--red-glow)",
          }}
        />
      )}
    </div>
  );
};

// ============ PiRingMeter — Apple-watch ring 78×78 ============
export const PiRingMeter = ({
  value,
  min = -2,
  max = 2,
  size = 78,
  sev = "purple",
  centerLabel,
  sublabel,
}: {
  value: number | null | undefined;
  min?: number;
  max?: number;
  size?: number;
  sev?: Sev;
  centerLabel?: ReactNode;
  sublabel?: string;
}) => {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const span = max - min;
  const pct = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / span));
  const color = sevVar(sev);
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--chrome-2)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 4px ${sevGlow(sev)})` }}
        />
      </svg>
      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontFamily: "Orbitron, sans-serif", fontWeight: 700,
        }}
      >
        <div style={{ fontSize: 30, color, textShadow: `0 0 6px ${sevGlow(sev)}`, lineHeight: 1 }}>
          {centerLabel ?? (value != null ? value.toFixed(2) : "—")}
        </div>
        {sublabel && (
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "var(--dim)", marginTop: 2, letterSpacing: "0.1em" }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
};

// ============ PiUSHeatmap — 20-col bar heatmap, 38px tall ============
export const PiUSHeatmap = ({
  values,
  height = 38,
  sev = "yellow",
}: {
  values: number[];
  height?: number;
  sev?: Sev;
}) => {
  const cells = values.length > 0 ? values.slice(0, 20) : Array.from({ length: 20 }, () => 0);
  while (cells.length < 20) cells.push(0);
  const max = Math.max(1, ...cells);
  const color = sevVar(sev);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(20, 1fr)",
        gap: 2,
        width: "100%",
        height,
        alignItems: "end",
      }}
    >
      {cells.map((v, i) => {
        const h = 18 + (v / max) * (height - 18);
        const tone = v / max;
        const c = tone > 0.66 ? "var(--red)" : tone > 0.33 ? color : "var(--green)";
        return (
          <div
            key={i}
            style={{
              height: `${(h / height) * 100}%`,
              background: c,
              opacity: 0.4 + tone * 0.6,
              boxShadow: `0 0 4px ${c}`,
            }}
          />
        );
      })}
    </div>
  );
};

// ============ PiCellStack — vertical battery, 70h × 16w cells ============
export const PiCellStack = ({
  cells,
  width = 16,
  height = 70,
  color = PI_COLORS.GREEN,
}: {
  cells: { lit: boolean; tone?: "ok" | "warn" | "crit" }[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  const gap = 2;
  const ch = (height - gap * (cells.length - 1)) / cells.length;
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap, width, height }}>
      {cells.map((c, i) => {
        const tone = c.tone === "crit" ? "var(--red)" : c.tone === "warn" ? "var(--yellow)" : color;
        return (
          <div
            key={i}
            style={{
              width, height: ch,
              background: c.lit ? tone : "transparent",
              border: `1px solid ${tone}`,
              opacity: c.lit ? 1 : 0.25,
              boxShadow: c.lit ? `0 0 4px ${tone}` : "none",
            }}
          />
        );
      })}
    </div>
  );
};

// ============ PiAreaChart — filled area with gradient ============
export const PiAreaChart = ({
  data,
  width = 280,
  height = 64,
  color = PI_COLORS.RED,
  gradientId = "pi-area-grad",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradientId?: string;
}) => {
  if (data.length < 2) data = [0, 0];
  const min = Math.min(...data);
  const max = Math.max(...data, min + 1);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 4) - 2).toFixed(1)}`);
  const path = `M 0,${height} L ${pts.join(" L ")} L ${width},${height} Z`;
  const line = `M ${pts.join(" L ")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#${gradientId})`} />
      <path d={line} stroke={color} strokeWidth={1.5} fill="none" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

// ============ PiQuakeProfile — mountain silhouette + epicenter spike ============
export const PiQuakeProfile = ({
  magnitude,
  width = 130,
  height = 70,
  color = PI_COLORS.RED,
}: {
  magnitude: number | null | undefined;
  width?: number;
  height?: number;
  color?: string;
}) => {
  const m = magnitude ?? 0;
  const spikeH = Math.max(8, (m / 9) * (height - 6));
  const cx = width * 0.55;
  // Mountain silhouette polyline
  const base = height - 4;
  const path = `M 0 ${base} L ${width * 0.18} ${base - 16} L ${width * 0.32} ${base - 6} L ${width * 0.45} ${base - 22} L ${cx} ${base - spikeH} L ${width * 0.65} ${base - 18} L ${width * 0.78} ${base - 30} L ${width * 0.9} ${base - 12} L ${width} ${base} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id="pi-quake-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#pi-quake-grad)" stroke={color} strokeWidth={1.5} strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={cx} cy={base - spikeH} r={3} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

// ============ PiHistogram — 10 mini vertical bars ============
export const PiHistogram = ({
  data,
  width = 90,
  height = 36,
  color = PI_COLORS.GREEN,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) => {
  const bars = data.length > 0 ? data.slice(-10) : Array.from({ length: 10 }, () => 0);
  while (bars.length < 10) bars.unshift(0);
  const max = Math.max(1, ...bars);
  const gap = 2;
  const bw = (width - gap * 9) / 10;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {bars.map((v, i) => {
        const h = (v / max) * (height - 2);
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={Math.max(1, h)}
            fill={color}
            opacity={0.4 + (v / max) * 0.6}
          />
        );
      })}
    </svg>
  );
};

// ============ PiPulseLine — heartbeat oscilloscope ============
export const PiPulseLine = ({
  width = 140,
  height = 30,
  color = PI_COLORS.GREEN,
}: {
  width?: number;
  height?: number;
  color?: string;
}) => {
  const m = height / 2;
  // QRS-style heartbeat
  const path = `M 0 ${m} L ${width * 0.15} ${m} L ${width * 0.2} ${m - 2} L ${width * 0.25} ${m + 2} L ${width * 0.3} ${m - height * 0.4} L ${width * 0.34} ${m + height * 0.35} L ${width * 0.38} ${m} L ${width * 0.55} ${m} L ${width * 0.6} ${m - 2} L ${width * 0.65} ${m + 2} L ${width * 0.7} ${m - height * 0.4} L ${width * 0.74} ${m + height * 0.35} L ${width * 0.78} ${m} L ${width} ${m}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
};

// ============ PiGlobe — orange wireframe with pulsing pins ============
export const PiGlobe = ({
  size = 80,
  pins = [],
  color = PI_COLORS.ORANGE,
}: {
  size?: number;
  pins?: { x: number; y: number; color: string }[]; // x,y in 0..1
  color?: string;
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={2.5}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        {/* Equator */}
        <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.28} fill="none" stroke={color} strokeWidth={2} opacity={0.7} />
        {/* Meridians */}
        <ellipse cx={cx} cy={cy} rx={r * 0.4} ry={r} fill="none" stroke={color} strokeWidth={2} opacity={0.55} />
        <ellipse cx={cx} cy={cy} rx={r * 0.75} ry={r} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={color} strokeWidth={2} opacity={0.5} />
      </svg>
      {pins.map((p, i) => (
        <span
          key={i}
          className="pi-globe-pin"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
};

// ============ PiKpField — concentric ellipses + Kp value ============
export const PiKpField = ({
  kp,
  size = 80,
  color = PI_COLORS.BLUE,
}: {
  kp: number | null | undefined;
  size?: number;
  color?: string;
}) => {
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size * 0.7, display: "inline-block" }}>
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} aria-hidden>
        {[1, 0.78, 0.55, 0.32].map((s, i) => (
          <ellipse
            key={i}
            cx={cx}
            cy={cy * 0.8}
            rx={(size / 2 - 2) * s}
            ry={(size * 0.28) * s}
            fill="none"
            stroke={color}
            strokeWidth={2}
            opacity={0.3 + i * 0.15}
            style={{ filter: `drop-shadow(0 0 3px ${color})` }}
          />
        ))}
        <circle cx={cx} cy={cy * 0.8} r={5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      {kp != null && (
        <div style={{
          position: "absolute", bottom: -2, left: 0, right: 0,
          textAlign: "center",
          fontFamily: "Orbitron, sans-serif", fontWeight: 700, fontSize: 22,
          color, textShadow: `0 0 6px ${color}`,
        }}>
          Kp {Math.round(kp)}
        </div>
      )}
    </div>
  );
};

// ============ Back-compat wrappers (used by older PiTile callsites) ============
export const PiDial = (props: any) => {
  // Map old API -> half-ring
  const zones = (props.zones || []).map((z: any) => ({
    from: z.from, to: z.to,
    color: z.color === PI_COLORS.AMBER ? PI_COLORS.YELLOW : z.color,
  }));
  return <PiHalfRing value={props.value} min={props.min} max={props.max} zones={zones} width={110} height={60} />;
};

export const PiSegmentedBar = ({
  cells,
  active,
  width = 90,
  height = 10,
}: {
  cells: { color: string; lit?: boolean }[];
  active?: number;
  width?: number;
  height?: number;
}) => {
  const gap = 2;
  const cw = (width - gap * (cells.length - 1)) / cells.length;
  return (
    <svg width={width} height={height} aria-hidden>
      {cells.map((c, i) => {
        const lit = c.lit ?? (active != null && i <= active);
        return (
          <rect key={i} x={i * (cw + gap)} y={0} width={cw} height={height}
            fill={c.color} opacity={lit ? 0.95 : 0.18}
            style={{ filter: lit ? `drop-shadow(0 0 3px ${c.color})` : "none" }} />
        );
      })}
    </svg>
  );
};

export const PiCenteredBar = ({
  value, min = -1, max = 1, width = 90, height = 10, sev = "green",
}: {
  value: number | null | undefined;
  min?: number; max?: number; width?: number; height?: number;
  sev?: Sev | "info" | "watch" | "alert" | "clear";
}) => {
  const sevMap: Record<string, Sev> = { info: "green", watch: "yellow", alert: "red", clear: "green" };
  const s: Sev = (sevMap[sev as string] ?? (sev as Sev)) || "green";
  const color = sevVar(s);
  const mid = width / 2;
  if (value == null) {
    return (
      <svg width={width} height={height} aria-hidden>
        <rect x={0} y={height / 2 - 1} width={width} height={2} fill="var(--faint)" opacity={0.3} />
      </svg>
    );
  }
  const span = Math.max(Math.abs(min), Math.abs(max));
  const v = Math.max(-span, Math.min(span, value));
  const px = mid + (v / span) * (mid - 2);
  const x = Math.min(mid, px);
  const w = Math.abs(px - mid);
  return (
    <svg width={width} height={height} aria-hidden>
      <rect x={0} y={height / 2 - 1} width={width} height={2} fill="var(--faint)" opacity={0.4} />
      <rect x={x} y={1} width={Math.max(w, 1)} height={height - 2} fill={color} opacity={0.85} />
      <rect x={mid - 0.5} y={0} width={1} height={height} fill="var(--dim)" opacity={0.6} />
      <rect x={px - 1} y={-1} width={2} height={height + 2} fill={color} />
    </svg>
  );
};

export const PiFillBar = (props: { pct: number | null | undefined; width?: number; height?: number; redlinePct?: number }) =>
  <PiGradBar {...props} />;

export const PiStackedBar = ({
  segments, width = 90, height = 10,
}: { segments: { value: number; color: string }[]; width?: number; height?: number }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let x = 0;
  return (
    <svg width={width} height={height} aria-hidden>
      <rect x={0} y={0} width={width} height={height} fill="var(--faint)" opacity={0.2} />
      {segments.map((s, i) => {
        const w = (s.value / total) * width;
        const r = <rect key={i} x={x} y={0} width={w} height={height} fill={s.color} opacity={0.9} />;
        x += w;
        return r;
      })}
    </svg>
  );
};

export const PiHeatStrip = ({
  cells, width = 140, height = 14, baseColor = PI_COLORS.GREEN,
}: { cells: { intensity: number }[]; width?: number; height?: number; baseColor?: string }) => {
  const gap = 2;
  const cw = (width - gap * (cells.length - 1)) / cells.length;
  return (
    <svg width={width} height={height} aria-hidden>
      {cells.map((c, i) => (
        <rect key={i} x={i * (cw + gap)} y={0} width={cw} height={height}
          fill={baseColor} opacity={0.15 + Math.max(0, Math.min(1, c.intensity)) * 0.8} />
      ))}
    </svg>
  );
};
