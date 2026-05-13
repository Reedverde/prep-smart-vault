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
  /** Optional background image URL, applied to tile with low opacity */
  bgImage?: string;
  /** Background position for bgImage (default "right center") */
  bgPosition?: string;
  /** Mirror the bgImage horizontally */
  bgFlip?: boolean;
  /** Background size for bgImage (default "cover") */
  bgSize?: string;
  /** Horizontal pixel offset for bgImage (negative = shift left) */
  bgOffsetX?: number;
};

export const PiTile = ({ label, num, body, footer, sev = "green", wide, bgImage, bgPosition = "right center", bgFlip, bgSize = "cover", bgOffsetX = 0 }: PiTileProps) => {
  const style: React.CSSProperties = {};
  if (wide) style.gridColumn = "span 2 / span 2";
  return (
    <div
      className="pi-tile"
      data-sev={sev}
      style={style}
    >
      {bgImage && (
        <img
          src={bgImage}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: bgOffsetX,
            right: -bgOffsetX,
            height: "100%",
            width: "auto",
            objectFit: "cover",
            objectPosition: bgPosition,
            transform: bgFlip ? "scaleX(-1)" : undefined,
            opacity: 0.6,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
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
