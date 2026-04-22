// Single-tile primitive for the /pi operations-room dashboard.
// All styling uses scoped CSS variables (--pi-*) defined on the /pi root,
// so colors don't leak into the rest of the app's design system.

export type PiSeverity = "clear" | "watch" | "alert" | "info";

export type PiTileProps = {
  /** Tiny uppercase label, e.g. "WEATHER · LOCAL" */
  label: string;
  /** Headline value — short, e.g. "47°F", "0", "LOW" */
  value: string;
  /** Sub-line, e.g. "partly cloudy · wind 8mph" */
  sub?: string;
  /** Severity tier — drives left border color, value color, bg tint, pulse */
  sev?: PiSeverity;
  /** Span 2 columns for hierarchy */
  wide?: boolean;
  /** Two-digit slot number (e.g. "01") */
  num?: string;
  /** Optional sparkline data points (last ~12 values, unnormalized) */
  spark?: number[];
};

const sevColorVar = (sev: PiSeverity): string => {
  switch (sev) {
    case "alert":
      return "var(--pi-red)";
    case "watch":
      return "var(--pi-amber)";
    case "clear":
      return "var(--pi-green)";
    case "info":
    default:
      return "var(--pi-text-faint)";
  }
};

const sevBgGradient = (sev: PiSeverity): string => {
  switch (sev) {
    case "alert":
      return "linear-gradient(90deg, rgba(255,107,94,0.10) 0%, rgba(255,107,94,0) 35%)";
    case "watch":
      return "linear-gradient(90deg, rgba(244,181,92,0.06) 0%, rgba(244,181,92,0) 30%)";
    case "clear":
      return "linear-gradient(90deg, rgba(125,227,138,0.04) 0%, rgba(125,227,138,0) 25%)";
    default:
      return "none";
  }
};

// Build a 44×14 polyline string from arbitrary numeric series.
const buildSparkPoints = (data: number[]): string => {
  if (data.length < 2) return "";
  const w = 44;
  const h = 14;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  return data
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((v - min) / range) * h).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");
};

export const PiTile = ({ label, value, sub, sev = "info", wide, num, spark }: PiTileProps) => {
  const color = sevColorVar(sev);
  const valueSize = wide ? 120 : 84;
  const valueWeight = wide ? 200 : 250;

  return (
    <div
      data-sev={sev}
      className="relative flex flex-col p-3 min-h-0 overflow-hidden"
      style={{
        background: "#050705",
        backgroundImage: sevBgGradient(sev),
        borderLeft: `3px solid ${color}`,
        gridColumn: wide ? "span 2 / span 2" : undefined,
        animation: sev === "alert" ? "pi-alert-pulse 4s ease-in-out infinite" : undefined,
      }}
    >
      {/* Top row: label + slot number */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="uppercase truncate"
          style={{
            fontSize: 9,
            letterSpacing: "0.3em",
            color: "var(--pi-text-dim)",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {spark && spark.length > 1 && (
            <svg
              width={44}
              height={14}
              style={{ display: "block", opacity: 0.5 }}
              aria-hidden
            >
              <polyline
                fill="none"
                stroke={color}
                strokeWidth={1}
                points={buildSparkPoints(spark)}
              />
            </svg>
          )}
          {num && (
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "var(--pi-text-faint)",
                fontWeight: 400,
              }}
            >
              {num}
            </span>
          )}
        </div>
      </div>

      {/* Value — bottom-aligned via mt-auto */}
      <div
        className="mt-auto tabular-nums truncate"
        style={{
          color,
          fontSize: valueSize,
          fontWeight: valueWeight,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>

      {/* Sub-line */}
      {sub && (
        <div
          className="mt-1 truncate"
          style={{
            fontSize: 10,
            color: "var(--pi-text-dim)",
            letterSpacing: "0.05em",
            fontWeight: 400,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
