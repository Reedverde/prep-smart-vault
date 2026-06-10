import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Check, X, Copy, Loader2, AlertTriangle } from "lucide-react";

type Source = { label: string; keys: string[] };
type ResultStatus = "ok" | "fail" | "skipped" | "not_configured" | "degraded" | "partial" | "stale";
type Result = {
  label: string;
  status: ResultStatus;
  ms: number | null;
  error?: string;
  detail?: string;
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

// Inspect the settled payload for hints emitted by edge functions:
//   { notConfigured: true }                 → not_configured
//   { degraded: true, error?: string }      → degraded
//   { stale: true }  or { cacheSource: "cache-stale" } → stale
//   { partial: true, errors: string[] }     → partial
const classifyData = (data: any): { status: ResultStatus | null; detail?: string } => {
  if (!data || typeof data !== "object") return { status: null };
  if (data.notConfigured) return { status: "not_configured" };
  if (data.degraded) return { status: "degraded", detail: data.error || "upstream degraded" };
  if (data.stale || data.cacheSource === "cache-stale") return { status: "stale", detail: "serving cached" };
  if (data.partial && Array.isArray(data.errors) && data.errors.length) {
    return { status: "partial", detail: data.errors.join(" · ") };
  }
  return { status: null };
};

const statusColor = (s: ResultStatus): string => {
  switch (s) {
    case "ok":
      return "hsl(var(--severity-low))";
    case "fail":
      return "hsl(var(--severity-critical))";
    case "partial":
    case "degraded":
    case "stale":
      return "hsl(var(--severity-moderate))";
    default:
      return "hsl(var(--dim))";
  }
};

const StatusIcon = ({ s }: { s: ResultStatus }) => {
  const color = statusColor(s);
  if (s === "ok" || s === "not_configured") return <Check className="h-3 w-3 shrink-0" style={{ color }} />;
  if (s === "fail") return <X className="h-3 w-3 shrink-0" style={{ color }} />;
  if (s === "partial" || s === "degraded" || s === "stale")
    return <AlertTriangle className="h-3 w-3 shrink-0" style={{ color }} />;
  return <span className="h-3 w-3 shrink-0 inline-flex items-center justify-center text-dim">·</span>;
};

export const HealthCheckButton = ({ sources }: { sources: Source[] }) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const run = async () => {
    setRunning(true);
    setResults([]);
    setExpanded({});
    setStartedAt(new Date());

    const out = await Promise.all(
      sources.map(async (s): Promise<Result> => {
        const start = performance.now();
        const queries = s.keys.flatMap((k) =>
          qc.getQueryCache().findAll({ queryKey: [k], exact: false }),
        );
        if (queries.length === 0) {
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
          const states = s.keys.flatMap((k) =>
            qc.getQueryCache().findAll({ queryKey: [k], exact: false }).map((q) => q.state),
          );
          const anyError = states.find((st) => st.status === "error");
          if (anyError) {
            const raw = (anyError.error as Error)?.message || "error";
            return { label: s.label, status: "fail", ms, error: raw };
          }
          // Inspect payload for degraded / stale / partial signals.
          const data = states[0]?.data;
          const cls = classifyData(data);
          if (cls.status) {
            return { label: s.label, status: cls.status, ms, detail: cls.detail };
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
      results: results.map((r) => {
        const queries = sources
          .find((s) => s.label === r.label)
          ?.keys.flatMap((k) =>
            qc.getQueryCache().findAll({ queryKey: [k], exact: false }),
          ) ?? [];
        const sample = queries[0]?.state?.data;
        return {
          ...r,
          errorUpdateCount: queries[0]?.state?.errorUpdateCount ?? 0,
          dataUpdatedAt: queries[0]?.state?.dataUpdatedAt ?? 0,
          dataPreview:
            sample && typeof sample === "object"
              ? {
                  degraded: (sample as any).degraded,
                  stale: (sample as any).stale,
                  partial: (sample as any).partial,
                  errors: (sample as any).errors,
                  notConfigured: (sample as any).notConfigured,
                }
              : undefined,
        };
      }),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      // noop
    }
  };

  const okCount = results.filter((r) => r.status === "ok" || r.status === "not_configured").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => ["partial", "degraded", "stale"].includes(r.status)).length;

  const statusLabel = (s: ResultStatus): string => {
    if (s === "not_configured") return "not configured";
    if (s === "stale") return "stale";
    if (s === "degraded") return "degraded";
    if (s === "partial") return "partial";
    return "";
  };

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
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
            {running ? "Checking" : "Force refresh"}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="font-mono text-[10px] text-dim">
            {okCount} ok · {warnCount} warn · {failCount} fail ·{" "}
            {results.length - okCount - failCount - warnCount} skipped
          </div>
          <div className="max-h-56 overflow-y-auto pr-1 -mr-1 scroll-thin space-y-0.5">
            {results.map((r) => {
              const isOpen = !!expanded[r.label];
              const hasMore = !!(r.error || r.detail);
              return (
                <div key={r.label} className="font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => hasMore && setExpanded((p) => ({ ...p, [r.label]: !p[r.label] }))}
                    className={`w-full flex items-center justify-between gap-2 py-0.5 text-left ${
                      hasMore ? "hover:bg-accent/30 rounded px-1 -mx-1 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <StatusIcon s={r.status} />
                      <span className="truncate text-foreground">{r.label}</span>
                      {statusLabel(r.status) && (
                        <span
                          className="text-[9px] uppercase shrink-0 px-1 rounded border"
                          style={{
                            color: statusColor(r.status),
                            borderColor: statusColor(r.status),
                            opacity: 0.8,
                          }}
                        >
                          {statusLabel(r.status)}
                        </span>
                      )}
                    </div>
                    <span className="text-dim shrink-0">
                      {r.status === "skipped" ? "—" : r.ms !== null ? `${r.ms}ms` : ""}
                    </span>
                  </button>
                  {isOpen && hasMore && (
                    <div
                      className="ml-5 mt-0.5 mb-1 px-2 py-1 rounded border border-border/40 bg-background/40 text-[10px] leading-relaxed break-words"
                      style={{ color: r.status === "fail" ? statusColor("fail") : "hsl(var(--dim))" }}
                    >
                      {r.error || r.detail}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
