// Pi3Tile — STATIC mirror of PiTile chrome (inner border, 4 corner brackets,
// header with id, severity-colored borders/value). No animations, no transitions.

import type { ReactNode } from "react";

export type Pi3Severity = "green" | "yellow" | "orange" | "red" | "purple" | "blue" | "dim";

export type Pi3TileProps = {
  label: string;
  num?: string;
  value?: ReactNode;
  footer?: ReactNode;
  sev?: Pi3Severity;
  wide?: boolean;
  noData?: boolean;
};

export const Pi3Tile = ({
  label, num, value, footer, sev = "green", wide, noData,
}: Pi3TileProps) => {
  const style: React.CSSProperties = {};
  if (wide) style.gridColumn = "span 2 / span 2";
  const effectiveSev: Pi3Severity = noData ? "dim" : sev;
  return (
    <div className="pi3-tile" data-sev={effectiveSev} style={style}>
      <div className="pi3-tile-inner" />
      <span className="pi3-tile-corner tl" />
      <span className="pi3-tile-corner tr" />
      <span className="pi3-tile-corner bl" />
      <span className="pi3-tile-corner br" />

      <div className="pi3-tile-header">
        <span>
          {label}
          {noData && (
            <span className="pi3-pill pi3-c-red" style={{ marginLeft: 6 }}>NO DATA</span>
          )}
        </span>
        {num && <span className="pi3-tile-id">{num}</span>}
      </div>

      <div className="pi3-tile-body">
        <span className="pi3-big pi3-value-color">
          {noData ? "—" : value ?? "—"}
        </span>
      </div>

      {footer && <div className="pi3-tile-footer">{footer}</div>}
    </div>
  );
};
