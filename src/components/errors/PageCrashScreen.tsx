// Full screen Pip Boy crash UI. Pure inline styles and a single inline style
// tag for the scanline overlay so this works even if pi.css or another
// stylesheet is the thing that crashed.

type Props = { err: Error };

export const PageCrashScreen = ({ err }: Props) => (
  <div
    role="alert"
    style={{
      position: "fixed",
      inset: 0,
      background: "#020503",
      color: "#8fff7a",
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      zIndex: 9999,
    }}
  >
    <style>{`
      @keyframes ppCrashBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      .pp_crash_scan::before {
        content:""; position:absolute; inset:0; pointer-events:none;
        background: repeating-linear-gradient(
          to bottom,
          rgba(143,255,122,0.04) 0 2px,
          transparent 2px 4px
        );
        mix-blend-mode: screen;
      }
    `}</style>
    <div className="pp_crash_scan" style={{ position: "absolute", inset: 0 }} />
    <div style={{ position: "relative", textAlign: "center", maxWidth: 720 }}>
      <div style={{ fontSize: 14, letterSpacing: "0.4em", opacity: 0.7 }}>
        PREPPI :: TERMINAL
      </div>
      <h1
        style={{
          fontSize: 56,
          letterSpacing: "0.2em",
          margin: "16px 0 8px",
          color: "#ff4d6d",
        }}
      >
        SYSTEM FAULT
      </h1>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.25em",
          opacity: 0.75,
          marginBottom: 24,
        }}
      >
        UNHANDLED RENDER EXCEPTION
      </div>
      <pre
        style={{
          textAlign: "left",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "rgba(143,255,122,0.05)",
          border: "1px solid rgba(143,255,122,0.25)",
          padding: 16,
          fontSize: 13,
          lineHeight: 1.5,
          maxHeight: 240,
          overflow: "auto",
          color: "#8fff7a",
        }}
      >
        {`> ${err.name}: ${err.message}`}
      </pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 28,
          padding: "12px 28px",
          background: "transparent",
          color: "#8fff7a",
          border: "1px solid #8fff7a",
          fontFamily: "inherit",
          fontSize: 14,
          letterSpacing: "0.3em",
          cursor: "pointer",
        }}
      >
        REINITIALIZE
      </button>
      <div
        style={{
          marginTop: 24,
          fontSize: 12,
          letterSpacing: "0.25em",
          opacity: 0.6,
        }}
      >
        AWAITING OPERATOR
        <span style={{ animation: "ppCrashBlink 1s infinite" }}>_</span>
      </div>
    </div>
  </div>
);
