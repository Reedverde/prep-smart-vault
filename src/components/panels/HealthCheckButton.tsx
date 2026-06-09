import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Check, X, Copy, Loader2 } from "lucide-react";

type Source = { label: string; keys: string[] };
type Result = {
  label: string;
  status: "ok" | "fail" | "skipped" | "not_configured";
  ms: number | null;
  error?: string;
};

const TIMEOUT_MS = 20000;

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });

export const HealthCheckButton = ({ sources }: { sources: Source[] }) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const run = async () => {
    setRunning(true);
    setResults([]);
    setStartedAt(new Date());

    const out = await Promise.all(
      sources.map(async (s): Promise<Result> => {
        const start = performance.now();
        // Gather all matching queries (handles keyed variants like [key, lat, lng]).
        const queries = s.keys.flatMap((k) =>
          qc.getQueryCache().findAll({ queryKey: [k], exact: false }),
        );
        if (queries.length === 0 || queries.every((q) => !q.options.enabled && q.options.enabled !== undefined)) {
          return { label: s.label, status: "skipped", ms: null, error: "no active query" };
        }
        try {
          await withTimeout(
            Promise.all(
              s.keys.map((k) => qc.refetchQueries({ queryKey: [k], exact: false })),
            ),
            TIMEOUT_MS,
          );
          const ms = Math.round(performance.now() - start);
          // Read settled state.
          const states = s.keys.flatMap((k) =>
            qc.getQueryCache().findAll({ queryKey: [k], exact: false }).map((q) => q.state),
          );
          const anyError = states.find((st) => st.status === "error");
          if (anyError) {
            return {
              label: s.label,
              status: "fail",
              ms,
              error: (anyError.error as Error)?.message || "error",
            };
          }
          const data = states[0]?.data as any;
          if (data && typeof data === "object" && data.notConfigured) {
            return { label: s.label, status: "not_configured", ms };
          }
          return { label: s.label, status: "ok", ms };
        } catch (e: any) {
          const ms = Math.round(performance.now() - start);
          return { label: s.label, status: "fail", ms, error: e?.message || String(e) };
        }
      }),
    );

    setResults(out);
    setRunning(false);
  };

  const copyDiagnostics = async () => {
    const payload = {
      startedAt: startedAt?.toISOString(),
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      results,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      // noop
    }
  };

  const okCount = results.filter((r) => r.status === "ok" || r.status === "not_configured").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  return (
    <div className="rounded-md bg-inset border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
          Stability check
        </span>
        <div className="flex items-center gap-2">
          {results.length > 0 && !running && (
            <button
              type="button"
              onClick={copyDiagnostics}
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-dim hover:text-foreground transition-colors"
              title="Copy diagnostics JSON"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-border/60 bg-background hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Activity className="h-3 w-3" />
            )}
            {running ? "Checking" : "Force refresh"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="font-mono text-[10px] text-dim">
            {okCount} ok · {failCount} fail · {results.length - okCount - failCount} skipped
          </div>
          <div className="max-h-40 overflow-y-auto pr-1 -mr-1 scroll-thin space-y-0.5">
            {results.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-2 py-0.5 font-mono text-[11px]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {r.status === "ok" || r.status === "not_configured" ? (
                    <Check className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--severity-low))" }} />
                  ) : r.status === "fail" ? (
                    <X className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--severity-critical))" }} />
                  ) : (
                    <span className="h-3 w-3 shrink-0 inline-flex items-center justify-center text-dim">·</span>
                  )}
                  <span className="truncate text-foreground">{r.label}</span>
                  {r.status === "not_configured" && (
                    <span className="text-[9px] uppercase text-dim shrink-0">not configured</span>
                  )}
                </div>
                <span className="text-dim shrink-0">
                  {r.status === "skipped" ? "—" : r.ms !== null ? `${r.ms}ms` : ""}
                  {r.status === "fail" && r.error ? (
                    <span className="ml-2 text-[10px]" style={{ color: "hsl(var(--severity-critical))" }} title={r.error}>
                      {r.error.length > 40 ? r.error.slice(0, 40) + "…" : r.error}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
