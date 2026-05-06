// Tiny inline-SVG visualization primitives scoped to /pi tiles.
// All colors come from --pi-* CSS vars set on the /pi root.

const GREEN = "var(--pi-green)";
const AMBER = "var(--pi-amber)";
const RED = "var(--pi-red)";
const DIM = "var(--pi-text-faint)";

const sevColor = (sev: "clear" | "watch" | "alert" | "info" = "info") =>
  sev === "alert" ? RED : sev === "watch" ? AMBER : sev === "clear" ? GREEN : GREEN;

// ============ PiDial — half-circle gauge ============
export const PiDial = ({
  value,
  min = 0,
  max = 100,
  zones,
  size = 56,
}: {
  value: number | null | undefined;
  min?: number;
  max?: number;
  zones: { from: number; to: number; color: string }[];
  size?: number;
}) => {
  const w = size;
  const h = size / 2 + 4;
  const cx = w / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const stroke = 5;
  const polar = (deg: number, rad: number) => {
    const a = ((deg - 180) * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const arc = (s: number, e: number, rad: number) => {
    const [x1, y1] = polar(s, rad);
    const [x2, y2] = polar(e, rad);
    const large = e - s > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rad} ${rad} 0 ${large} 1 ${x2} ${y2}`;
  };
  const v2d = (v: number) =>
    ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 180;
  const v = value ?? min;
  const [nx, ny] = polar(v2d(v), r - 2);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {zones.map((z, i) => (
        <path
          key={i}
          d={arc(v2d(z.from), v2d(z.to), r)}
          stroke={z.color}
          strokeWidth={stroke}
          fill="none"
          opacity={0.7}
        />
      ))}
      {value != null && (
        <>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={2} fill="currentColor" />
        </>
      )}
    </svg>
  );
};

// ============ PiSegmentedBar — N discrete cells, lit ones glow ============
export const PiSegmentedBar = ({
  cells,
  active,
  width = 60,
  height = 10,
}: {
  cells: { color: string; lit?: boolean }[];
  active?: number; // alt: index of single active cell
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
          <rect
            key={i}
            x={i * (cw + gap)}
            y={0}
            width={cw}
            height={height}
            fill={c.color}
            opacity={lit ? 0.95 : 0.18}
          />
        );
      })}
    </svg>
  );
};

// ============ PiCenteredBar — bipolar with zero line ============
export const PiCenteredBar = ({
  value,
  min = -1,
  max = 1,
  width = 70,
  height = 10,
  sev = "info",
}: {
  value: number | null | undefined;
  min?: number;
  max?: number;
  width?: number;
  height?: number;
  sev?: "clear" | "watch" | "alert" | "info";
}) => {
  const color = sevColor(sev);
  const mid = width / 2;
  if (value == null) {
    return (
      <svg width={width} height={height} aria-hidden>
        <rect x={0} y={height / 2 - 1} width={width} height={2} fill={DIM} opacity={0.3} />
        <rect x={mid - 0.5} y={0} width={1} height={height} fill={DIM} opacity={0.5} />
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
      <rect x={0} y={height / 2 - 1} width={width} height={2} fill={DIM} opacity={0.25} />
      <rect x={x} y={1} width={Math.max(w, 1)} height={height - 2} fill={color} opacity={0.85} />
      <rect x={mid - 0.5} y={0} width={1} height={height} fill={DIM} opacity={0.6} />
      <rect x={px - 1} y={-1} width={2} height={height + 2} fill={color} />
    </svg>
  );
};

// ============ PiFillBar — horizontal % fill ============
export const PiFillBar = ({
  pct,
  width = 60,
  height = 10,
  sev = "info",
}: {
  pct: number | null | undefined;
  width?: number;
  height?: number;
  sev?: "clear" | "watch" | "alert" | "info";
}) => {
  const color = sevColor(sev);
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <svg width={width} height={height} aria-hidden>
      <rect x={0} y={0} width={width} height={height} fill={color} opacity={0.12} />
      <rect x={0} y={0} width={(width * p) / 100} height={height} fill={color} opacity={0.85} />
    </svg>
  );
};

// ============ PiStackedBar — proportional segments ============
export const PiStackedBar = ({
  segments,
  width = 70,
  height = 10,
}: {
  segments: { value: number; color: string }[];
  width?: number;
  height?: number;
}) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let x = 0;
  return (
    <svg width={width} height={height} aria-hidden>
      <rect x={0} y={0} width={width} height={height} fill={DIM} opacity={0.15} />
      {segments.map((s, i) => {
        const w = (s.value / total) * width;
        const r = <rect key={i} x={x} y={0} width={w} height={height} fill={s.color} opacity={0.9} />;
        x += w;
        return r;
      })}
    </svg>
  );
};

// ============ PiHeatStrip — N cells colored by intensity 0..1 ============
export const PiHeatStrip = ({
  cells,
  width = 120,
  height = 14,
  baseColor = GREEN,
}: {
  cells: { label?: string; intensity: number }[];
  width?: number;
  height?: number;
  baseColor?: string;
}) => {
  const gap = 2;
  const cw = (width - gap * (cells.length - 1)) / cells.length;
  return (
    <svg width={width} height={height} aria-hidden>
      {cells.map((c, i) => {
        const op = 0.15 + Math.max(0, Math.min(1, c.intensity)) * 0.8;
        return (
          <rect
            key={i}
            x={i * (cw + gap)}
            y={0}
            width={cw}
            height={height}
            fill={baseColor}
            opacity={op}
          />
        );
      })}
    </svg>
  );
};

export const PI_COLORS = { GREEN, AMBER, RED, DIM };
