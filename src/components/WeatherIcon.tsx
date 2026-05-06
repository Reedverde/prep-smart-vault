// Pip-Boy-styled monochrome weather icons. Inline SVG using currentColor so
// the parent decides the phosphor hue. Optional dotted grid background to
// match the CRT aesthetic.

import type { ReactNode } from "react";

export type WeatherVariant =
  | "sun"
  | "clear-night"
  | "partly-cloudy"
  | "partly-cloudy-night"
  | "cloudy"
  | "rain"
  | "tstorm"
  | "snow"
  | "fog"
  | "wind";

export const iconForForecast = (text: string | undefined | null, isDay = true): WeatherVariant => {
  const t = (text || "").toLowerCase();
  if (/thunder|t-storm|tstorm|lightning/.test(t)) return "tstorm";
  if (/snow|flurries|sleet|blizzard|wintry/.test(t)) return "snow";
  if (/rain|shower|drizzle/.test(t)) return "rain";
  if (/fog|mist|haze|smoke/.test(t)) return "fog";
  if (/wind|breezy|gust/.test(t)) return "wind";
  if (/partly|mostly cloudy|few clouds|scattered clouds/.test(t)) {
    return isDay ? "partly-cloudy" : "partly-cloudy-night";
  }
  if (/cloud|overcast/.test(t)) return "cloudy";
  if (/clear|sunny|fair/.test(t)) return isDay ? "sun" : "clear-night";
  return isDay ? "sun" : "clear-night";
};

const Sun = () => (
  <g>
    <circle cx="32" cy="32" r="9" fill="none" strokeWidth="2" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const r = (a * Math.PI) / 180;
      const x1 = 32 + Math.cos(r) * 14;
      const y1 = 32 + Math.sin(r) * 14;
      const x2 = 32 + Math.cos(r) * 20;
      const y2 = 32 + Math.sin(r) * 20;
      return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2" strokeLinecap="round" />;
    })}
  </g>
);

const Moon = () => (
  <path
    d="M40 18 a 16 16 0 1 0 6 22 a 12 12 0 1 1 -6 -22 z"
    fill="none"
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

const Cloud = ({ y = 0 }: { y?: number }) => (
  <path
    d={`M16 ${42 + y} a8 8 0 0 1 4 -15 a10 10 0 0 1 19 -2 a7 7 0 0 1 9 7 a6 6 0 0 1 -5 10 H18 a6 6 0 0 1 -2 -0 z`}
    fill="none"
    strokeWidth="2"
    strokeLinejoin="round"
  />
);

const PartlyCloudy = ({ night = false }: { night?: boolean }) => (
  <g>
    {night ? (
      <path d="M28 14 a10 10 0 1 0 4 14 a8 8 0 1 1 -4 -14 z" fill="none" strokeWidth="2" />
    ) : (
      <g>
        <circle cx="24" cy="22" r="6" fill="none" strokeWidth="2" />
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={24 + Math.cos(r) * 9}
              y1={22 + Math.sin(r) * 9}
              x2={24 + Math.cos(r) * 13}
              y2={22 + Math.sin(r) * 13}
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
      </g>
    )}
    <path
      d="M22 50 a7 7 0 0 1 4 -13 a9 9 0 0 1 17 0 a6 6 0 0 1 -1 12 H22 z"
      fill="none"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </g>
);

const Rain = () => (
  <g>
    <Cloud y={-4} />
    {[22, 30, 38, 46].map((x, i) => (
      <line key={x} x1={x} y1={46} x2={x - 3} y2={56} strokeWidth="2" strokeLinecap="round" opacity={i % 2 ? 0.7 : 1} />
    ))}
  </g>
);

const Storm = () => (
  <g>
    <Cloud y={-4} />
    <path d="M30 44 L26 54 L32 54 L28 62" fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    <line x1="42" y1="48" x2="40" y2="56" strokeWidth="2" strokeLinecap="round" />
  </g>
);

const Snow = () => (
  <g>
    <Cloud y={-4} />
    {[
      [22, 50],
      [32, 54],
      [42, 50],
      [27, 58],
      [37, 58],
    ].map(([x, y]) => (
      <g key={`${x}-${y}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1={x - 3} y1={y} x2={x + 3} y2={y} />
        <line x1={x} y1={y - 3} x2={x} y2={y + 3} />
        <line x1={x - 2} y1={y - 2} x2={x + 2} y2={y + 2} />
        <line x1={x - 2} y1={y + 2} x2={x + 2} y2={y - 2} />
      </g>
    ))}
  </g>
);

const Fog = () => (
  <g>
    <Cloud y={-8} />
    {[44, 50, 56].map((y, i) => (
      <line
        key={y}
        x1={10 + i * 2}
        y1={y}
        x2={54 - i * 2}
        y2={y}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.7}
      />
    ))}
  </g>
);

const Wind = () => (
  <g fill="none" strokeWidth="2" strokeLinecap="round">
    <path d="M8 22 H38 a6 6 0 1 0 -6 -6" />
    <path d="M8 34 H46 a7 7 0 1 1 -7 7" />
    <path d="M8 46 H30 a5 5 0 1 0 -5 -5" />
  </g>
);

const VARIANT_MAP: Record<WeatherVariant, ReactNode> = {
  sun: <Sun />,
  "clear-night": <Moon />,
  "partly-cloudy": <PartlyCloudy />,
  "partly-cloudy-night": <PartlyCloudy night />,
  cloudy: <Cloud />,
  rain: <Rain />,
  tstorm: <Storm />,
  snow: <Snow />,
  fog: <Fog />,
  wind: <Wind />,
};

export const WeatherIcon = ({
  variant,
  size = 64,
  withGrid = true,
  className,
}: {
  variant: WeatherVariant;
  size?: number;
  withGrid?: boolean;
  className?: string;
}) => {
  const gridId = `wx-grid-${variant}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
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
      {VARIANT_MAP[variant]}
    </svg>
  );
};
