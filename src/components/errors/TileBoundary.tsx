// Per tile error boundaries. Two flavors so each surface keeps its native shape.
// PiTileBoundary  — fallback renders a PiTile in the Pip Boy FEED FAULT state.
// PanelTileBoundary — fallback renders a Panel shaped div for /dashboard, /live.

import { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { PiTile } from "@/components/PiTile";

type PiTileBoundaryProps = {
  label: string;
  num?: string;
  wide?: boolean;
  children: ReactNode;
};

export const PiTileBoundary = ({ label, num, wide, children }: PiTileBoundaryProps) => (
  <ErrorBoundary
    fallback={(err) => (
      <PiTile
        label={label}
        num={num}
        sev="red"
        wide={wide}
        status="nodata"
        body={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              color: "var(--red)",
              fontFamily: "JetBrains Mono, monospace",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 22, letterSpacing: "0.18em" }}>FEED FAULT</span>
            <span
              style={{
                fontSize: 12,
                color: "var(--dim)",
                letterSpacing: "0.12em",
              }}
            >
              RENDER ERROR
            </span>
          </div>
        }
        footer={
          <span style={{ color: "var(--dim)" }}>
            {String(err.message).slice(0, 64).toLowerCase()}
          </span>
        }
      />
    )}
  >
    {children}
  </ErrorBoundary>
);

type PanelTileBoundaryProps = {
  label: string;
  children: ReactNode;
};

export const PanelTileBoundary = ({ label, children }: PanelTileBoundaryProps) => (
  <ErrorBoundary
    fallback={(err) => (
      <div
        className="rounded border bg-card p-4 font-mono text-xs"
        style={{ borderColor: "hsl(var(--destructive) / 0.6)" }}
        role="alert"
        aria-label={`${label} feed fault`}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="uppercase tracking-wider"
            style={{ color: "hsl(var(--destructive))" }}
          >
            {label} :: FEED FAULT
          </span>
          <span className="text-dim">RENDER ERROR</span>
        </div>
        <div className="text-dim truncate">{String(err.message).slice(0, 140)}</div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
