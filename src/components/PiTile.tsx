// PiTile — HUD-styled tile for the /pi kiosk console.
// All styling lives in src/styles/pi.css under .pi-root scope.

import type { ReactNode } from "react";

export type PiSeverity = "green" | "yellow" | "orange" | "red" | "purple" | "blue";

export type PiTileProps = {
  /** Uppercase header label, e.g. "WEATHER" */
  label: string;
  /** Two-digit slot number rendered top-right, e.g. "01" */
  num?: string;
  /** Tile body — viz fills the body, value can be inline within it */
  body?: ReactNode;
  /** Tiny lowercase footer line */
  footer?: ReactNode;
  /** Severity tier — drives border, corners, value color, alert pulse */
  sev?: PiSeverity;
  /** Span 2 columns */
  wide?: boolean;
};

export const PiTile = ({ label, num, body, footer, sev = "green", wide }: PiTileProps) => {
  return (
    <div
      className="pi-tile"
      data-sev={sev}
      style={wide ? { gridColumn: "span 2 / span 2" } : undefined}
    >
      <div className="pi-tile-inner" />
      <span className="pi-tile-corner tl" />
      <span className="pi-tile-corner tr" />
      <span className="pi-tile-corner bl" />
      <span className="pi-tile-corner br" />

      <div className="pi-tile-header">
        <span>{label}</span>
        {num && <span className="pi-tile-id">{num}</span>}
      </div>

      <div className="pi-tile-body">{body}</div>

      {footer && <div className="pi-tile-footer">{footer}</div>}
    </div>
  );
};
