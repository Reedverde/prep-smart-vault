// Pi3Tile — flat, static tile for /pi3. No animations, no transitions, no
// pseudo-element overlays, no gradients. Severity = static colored left border.

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
  return (
    <div className="pi3-tile" data-sev={sev} style={style}>
      <div className="pi3-tile-header">
        <span>{label}</span>
        {num && <span className="pi3-tile-id">{num}</span>}
      </div>
      <div className="pi3-tile-value" data-sev={sev}>
        {noData ? "—" : value ?? "—"}
      </div>
      {footer && <div className="pi3-tile-footer">{footer}</div>}
    </div>
  );
};
