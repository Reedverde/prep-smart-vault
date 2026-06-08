// Section level boundary. Wraps a tile grid so that a grid wide blow up does
// not take the page chrome with it. Renders a compact inline notice in the
// matching aesthetic with a RETRY SECTION action.

import { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

type Variant = "panel" | "pi";

type Props = {
  children: ReactNode;
  variant?: Variant;
};

export const SectionBoundary = ({ children, variant = "panel" }: Props) => (
  <ErrorBoundary
    fallback={(err, reset) =>
      variant === "pi" ? (
        <div
          role="alert"
          style={{
            margin: 24,
            padding: 24,
            border: "1px solid var(--red)",
            background: "rgba(255,77,109,0.06)",
            color: "var(--red)",
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.15em",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>SECTION FAULT</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--dim)",
              marginBottom: 16,
              wordBreak: "break-word",
            }}
          >
            {String(err.message).slice(0, 200)}
          </div>
          <button
            onClick={reset}
            style={{
              padding: "8px 20px",
              background: "transparent",
              color: "var(--green)",
              border: "1px solid var(--green)",
              fontFamily: "inherit",
              fontSize: 12,
              letterSpacing: "0.3em",
              cursor: "pointer",
            }}
          >
            RETRY SECTION
          </button>
        </div>
      ) : (
        <div
          role="alert"
          className="rounded border bg-card p-6 font-mono text-xs text-center"
          style={{ borderColor: "hsl(var(--destructive) / 0.6)" }}
        >
          <div
            className="uppercase tracking-widest text-base mb-2"
            style={{ color: "hsl(var(--destructive))" }}
          >
            SECTION FAULT
          </div>
          <div className="text-dim mb-4 break-words">
            {String(err.message).slice(0, 200)}
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 border border-primary text-primary uppercase tracking-widest text-xs hover:bg-primary/10 transition-colors"
          >
            RETRY SECTION
          </button>
        </div>
      )
    }
  >
    {children}
  </ErrorBoundary>
);
