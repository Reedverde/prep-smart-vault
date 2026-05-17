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

// ============ PiWeatherIcon — variant-driven (sun / moon / clouds / rain / snow / storm / fog / wind) ============
import type { WeatherVariant } from "@/components/WeatherIcon";

export const PiWeatherIcon = ({
  size = 48,
  variant = "sun",
}: {
  size?: number;
  variant?: WeatherVariant;
}) => {
  const sunFill = "url(#piwx-sun)";
  const moonFill = "url(#piwx-moon)";
  const cloudColor = "#cfd8e3";
  const cloudShadow = "#7d8a99";
  const rainColor = "#5fb8ff";
  const snowColor = "#e8f4ff";
  const boltColor = "#ffe066";

  // Cloud path centered roughly at (24,30), used by cloudy/rain/storm/snow/fog
  const Cloud = ({ y = 0, opacity = 1 }: { y?: number; opacity?: number }) => (
    <path
      d={`M12 ${34 + y} a7 7 0 0 1 4 -13 a9 9 0 0 1 17 -1 a6 6 0 0 1 8 6 a5 5 0 0 1 -5 8 H14 a5 5 0 0 1 -2 0 z`}
      fill={cloudColor}
      stroke={cloudShadow}
      strokeWidth={1.2}
      strokeLinejoin="round"
      opacity={opacity}
    />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <radialGradient id="piwx-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd84d" />
          <stop offset="100%" stopColor="#ff9d3a" />
        </radialGradient>
        <radialGradient id="piwx-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8eefc" />
          <stop offset="100%" stopColor="#8aa1c9" />
        </radialGradient>
      </defs>

      {variant === "sun" && (
        <g>
          <circle cx="24" cy="24" r="9" fill={sunFill} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={24 + Math.cos(rad) * 14}
                y1={24 + Math.sin(rad) * 14}
                x2={24 + Math.cos(rad) * 19}
                y2={24 + Math.sin(rad) * 19}
                stroke="#ffd84d"
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      )}

      {variant === "clear-night" && (
        <path
          d="M30 8 a16 16 0 1 0 10 28 a13 13 0 1 1 -10 -28 z"
          fill={moonFill}
          stroke="#6b80a8"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      )}

      {variant === "partly-cloudy" && (
        <g>
          <circle cx="16" cy="16" r="6" fill={sunFill} />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                x1={16 + Math.cos(rad) * 9}
                y1={16 + Math.sin(rad) * 9}
                x2={16 + Math.cos(rad) * 13}
                y2={16 + Math.sin(rad) * 13}
                stroke="#ffd84d"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            );
          })}
          <Cloud y={4} />
        </g>
      )}

      {variant === "partly-cloudy-night" && (
        <g>
          <path
            d="M18 8 a9 9 0 1 0 4 14 a7 7 0 1 1 -4 -14 z"
            fill={moonFill}
            stroke="#6b80a8"
            strokeWidth={1.2}
          />
          <Cloud y={6} />
        </g>
      )}

      {variant === "cloudy" && (
        <g>
          <Cloud y={-2} opacity={0.6} />
          <Cloud y={4} />
        </g>
      )}

      {variant === "rain" && (
        <g>
          <Cloud y={-4} />
          {[16, 22, 28, 34].map((x, i) => (
            <line
              key={x}
              x1={x}
              y1={36}
              x2={x - 3}
              y2={44}
              stroke={rainColor}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={i % 2 ? 0.7 : 1}
            />
          ))}
        </g>
      )}

      {variant === "tstorm" && (
        <g>
          <Cloud y={-4} />
          <path
            d="M24 34 L20 42 L25 42 L21 50"
            fill="none"
            stroke={boltColor}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 3px ${boltColor})` }}
          />
          <line x1={32} y1={38} x2={30} y2={45} stroke={rainColor} strokeWidth={2} strokeLinecap="round" />
        </g>
      )}

      {variant === "snow" && (
        <g>
          <Cloud y={-4} />
          {[
            [16, 38],
            [24, 42],
            [32, 38],
            [20, 46],
            [28, 46],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`} stroke={snowColor} strokeWidth={1.4} strokeLinecap="round">
              <line x1={x - 2.5} y1={y} x2={x + 2.5} y2={y} />
              <line x1={x} y1={y - 2.5} x2={x} y2={y + 2.5} />
              <line x1={x - 1.8} y1={y - 1.8} x2={x + 1.8} y2={y + 1.8} />
              <line x1={x - 1.8} y1={y + 1.8} x2={x + 1.8} y2={y - 1.8} />
            </g>
          ))}
        </g>
      )}

      {variant === "fog" && (
        <g>
          <Cloud y={-8} opacity={0.85} />
          {[36, 40, 44].map((y, i) => (
            <line
              key={y}
              x1={6 + i * 2}
              y1={y}
              x2={42 - i * 2}
              y2={y}
              stroke={cloudColor}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.75 - i * 0.15}
            />
          ))}
        </g>
      )}

      {variant === "wind" && (
        <g fill="none" stroke={cloudColor} strokeWidth={2} strokeLinecap="round">
          <path d="M6 16 H28 a5 5 0 1 0 -5 -5" />
          <path d="M6 26 H34 a5 5 0 1 1 -5 5" />
          <path d="M6 36 H22 a4 4 0 1 0 -4 -4" />
        </g>
      )}
    </svg>
  );
};


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

// ============ PiRadarSweep — pure CSS conic-gradient sweep + optional pins ============
export const PiRadarSweep = ({
  pins = [],
}: {
  /** Pins on the radar. angle in degrees (0 = up), radius 0–1 (fraction of radar half-width), color css var */
  pins?: Array<{ angle: number; radius: number; color: string }>;
} = {}) => (
  <div className="pi-radar" aria-hidden style={{ position: "relative" }}>
    <div className="pi-radar-cross" />
    <div className="pi-radar-sweep" />
    <div className="pi-radar-center" />
    {pins.map((p, i) => {
      const rad = (p.angle - 90) * (Math.PI / 180);
      const x = 50 + Math.cos(rad) * p.radius * 45;
      const y = 50 + Math.sin(rad) * p.radius * 45;
      return (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${y}%`,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: p.color,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}`,
            animation: "pi-pinpulse 2s ease-in-out infinite",
            zIndex: 3,
          }}
        />
      );
    })}
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

// ============ PiAqiArcGauge — segmented semicircle with pointer (AQI HUD) ============
export const PiAqiArcGauge = ({
  value,
  max = 300,
  width = 200,
  height = 118,
  ticks = 26,
}: {
  value: number | null | undefined;
  max?: number;
  width?: number;
  height?: number;
  ticks?: number;
}) => {
  const cx = width / 2;
  const cy = height - 8;
  const rOuter = Math.min(width / 2 - 6, height - 12);
  const rInner = rOuter - 22;
  const v = value == null ? 0 : Math.max(0, Math.min(max, value));
  const activeIdx = value == null ? -1 : Math.round((v / max) * (ticks - 1));

  const colorForAqi = (a: number) => {
    if (a <= 50) return PI_COLORS.GREEN;
    if (a <= 100) return PI_COLORS.YELLOW;
    if (a <= 150) return PI_COLORS.ORANGE;
    return PI_COLORS.RED;
  };
  const glowForAqi = (a: number) => {
    if (a <= 50) return "var(--green-glow)";
    if (a <= 100) return "var(--yellow-glow)";
    if (a <= 150) return "var(--orange-glow)";
    return "var(--red-glow)";
  };

  const cat = v <= 50 ? "GOOD" : v <= 100 ? "MODERATE" : v <= 150 ? "SENSITIVE" : v <= 200 ? "UNHEALTHY" : v <= 300 ? "VERY UNHEALTHY" : "HAZARDOUS";
  const activeColor = colorForAqi(v);
  const activeGlow = glowForAqi(v);

  // Pointer geometry
  const pointerAngleDeg = 180 + (v / max) * 180;
  const pa = (pointerAngleDeg * Math.PI) / 180;
  const ptipR = rInner - 4;
  const pbaseR = rInner - 14;
  const tipX = cx + Math.cos(pa) * ptipR;
  const tipY = cy + Math.sin(pa) * ptipR;
  const perp = pa + Math.PI / 2;
  const half = 5;
  const baseAx = cx + Math.cos(pa) * pbaseR + Math.cos(perp) * half;
  const baseAy = cy + Math.sin(pa) * pbaseR + Math.sin(perp) * half;
  const baseBx = cx + Math.cos(pa) * pbaseR - Math.cos(perp) * half;
  const baseBy = cy + Math.sin(pa) * pbaseR - Math.sin(perp) * half;

  return (
    <div style={{ position: "relative", width, height, display: "inline-block" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        {Array.from({ length: ticks }).map((_, i) => {
          const t = i / (ticks - 1);
          const angDeg = 180 + t * 180;
          const ang = (angDeg * Math.PI) / 180;
          const aqiAtTick = t * max;
          const color = colorForAqi(aqiAtTick);
          const isActive = value != null && i <= activeIdx;
          const x1 = cx + Math.cos(ang) * rInner;
          const y1 = cy + Math.sin(ang) * rInner;
          const x2 = cx + Math.cos(ang) * rOuter;
          const y2 = cy + Math.sin(ang) * rOuter;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={isActive ? 1 : 0.18}
              style={isActive ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}
            />
          );
        })}
        {value != null && (
          <polygon
            points={`${tipX},${tipY} ${baseAx},${baseAy} ${baseBx},${baseBy}`}
            fill="var(--text)"
            opacity={0.95}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "Orbitron, sans-serif",
            fontWeight: 700,
            fontSize: 38,
            lineHeight: 1,
            color: activeColor,
            textShadow: `0 0 10px ${activeGlow}`,
          }}
        >
          {value != null ? Math.round(value) : "—"}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            letterSpacing: "0.18em",
            color: activeColor,
            marginTop: 4,
          }}
        >
          {value != null ? cat : ""}
        </div>
      </div>
    </div>
  );
};

// ============ PiStressHud — circle (number) + segmented level bar (HUD style) ============
export const PiStressHud = ({
  value,
  min = -2,
  max = 3,
  sev = "purple",
  ringSize = 88,
  barWidth = 110,
  segments = 12,
  levelLabel,
}: {
  value: number | null | undefined;
  min?: number;
  max?: number;
  sev?: Sev;
  ringSize?: number;
  barWidth?: number;
  segments?: number;
  levelLabel?: string;
}) => {
  const stroke = 8;
  const r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Ring fills based on |value| over a 0..3 reference (visual only)
  const ringPct =
    value == null ? 0 : Math.max(0, Math.min(1, Math.abs(value) / Math.max(Math.abs(min), Math.abs(max))));
  // Bar fills based on value mapped from min..max
  const barPct =
    value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const activeSegs = Math.round(barPct * segments);
  const color = sevVar(sev);
  const glow = sevGlow(sev);
  const segGap = 3;
  const segW = (barWidth - segGap * (segments - 1)) / segments;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* Left: HUD ring with number */}
      <div style={{ position: "relative", width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden>
          {/* outer faint frame */}
          <circle cx={ringSize / 2} cy={ringSize / 2} r={r + 4} fill="none" stroke="var(--chrome-2)" strokeWidth={1} opacity={0.5} />
          {/* track */}
          <circle cx={ringSize / 2} cy={ringSize / 2} r={r} stroke="var(--chrome-2)" strokeWidth={stroke} fill="none" />
          {/* arc */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * ringPct} ${c}`}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
          />
          {/* tick marks around ring */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * 2 * Math.PI - Math.PI / 2;
            const r1 = r - stroke / 2 - 4;
            const r2 = r - stroke / 2 - 7;
            const cx2 = ringSize / 2 + Math.cos(a) * r1;
            const cy2 = ringSize / 2 + Math.sin(a) * r1;
            const cx3 = ringSize / 2 + Math.cos(a) * r2;
            const cy3 = ringSize / 2 + Math.sin(a) * r2;
            return (
              <line key={i} x1={cx2} y1={cy2} x2={cx3} y2={cy3} stroke={color} strokeWidth={1} opacity={0.45} />
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Orbitron, sans-serif",
            fontWeight: 700,
            fontSize: ringSize >= 96 ? 24 : 21,
            color,
            textShadow: `0 0 6px ${glow}`,
            letterSpacing: "0.02em",
          }}
        >
          {value != null ? `${value > 0 ? "+" : ""}${value.toFixed(2)}` : "—"}
        </div>
      </div>

      {/* Right: segmented HUD bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: segGap, alignItems: "center" }}>
          {Array.from({ length: segments }).map((_, i) => {
            const isActive = i < activeSegs;
            return (
              <div
                key={i}
                style={{
                  width: segW,
                  height: 22,
                  background: isActive ? color : "var(--chrome-2)",
                  opacity: isActive ? 1 : 0.35,
                  boxShadow: isActive ? `0 0 4px ${glow}` : undefined,
                  clipPath:
                    "polygon(15% 0, 100% 0, 100% 100%, 0 100%, 0 15%)",
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            color,
            textShadow: `0 0 4px ${glow}`,
            textAlign: "right",
          }}
        >
          {levelLabel ?? "LEVEL"}
        </div>
      </div>
    </div>
  );
};
