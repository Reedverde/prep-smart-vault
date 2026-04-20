import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  source?: string;
  sourceUrl?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export const Panel = ({ title, source, sourceUrl, children, className, action }: PanelProps) => (
  <section
    className={cn(
      "rounded-lg border border-border bg-card overflow-hidden flex flex-col",
      className,
    )}
  >
    <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border">
      <h2 className="panel-title">{title}</h2>
      <div className="flex items-center gap-3">
        {action}
        {source && (
          sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] uppercase tracking-wider text-dim hover:text-accent transition-colors"
            >
              {source} ↗
            </a>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
              {source}
            </span>
          )
        )}
      </div>
    </header>
    <div className="p-4 flex-1">{children}</div>
  </section>
);

export const StatBox = ({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
}) => (
  <div className="rounded-md bg-inset border border-border/60 p-3">
    <div className="font-mono text-[10px] uppercase tracking-wider text-dim mb-1">{label}</div>
    <div className="flex items-baseline gap-1">
      <span className="font-mono text-2xl font-semibold text-foreground">{value}</span>
      {unit && <span className="font-mono text-sm text-dim">{unit}</span>}
    </div>
    {hint && <div className="font-mono text-[10px] text-muted-foreground mt-1">{hint}</div>}
  </div>
);

export const SeverityBadge = ({
  level,
  children,
}: {
  level: "low" | "moderate" | "severe" | "critical";
  children: ReactNode;
}) => {
  const colors = {
    low: "bg-severity-low/15 text-severity-low border-severity-low/30",
    moderate: "bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30",
    severe: "bg-severity-severe/15 text-severity-severe border-severity-severe/30",
    critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wider",
        colors[level],
      )}
    >
      {children}
    </span>
  );
};

export const ContextBox = ({ children }: { children: ReactNode }) => (
  <div className="rounded-md bg-inset border border-border/60 p-3 font-mono text-xs text-dim leading-relaxed">
    {children}
  </div>
);
