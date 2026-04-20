import { ReactNode } from "react";
import { HelpCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const InfoTip = ({ children, className }: { children: ReactNode; className?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className={cn("inline-flex text-dim hover:text-foreground transition-colors", className)}>
        <HelpCircle className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs font-mono text-xs leading-relaxed">{children}</TooltipContent>
  </Tooltip>
);

export const PanelSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-4 bg-secondary rounded" style={{ width: `${100 - i * 15}%` }} />
    ))}
  </div>
);

export const PanelError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
    <AlertTriangle className="h-6 w-6 text-severity-moderate" />
    <p className="font-mono text-xs text-dim max-w-xs">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
      >
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    )}
  </div>
);

export const RefreshButton = ({ onClick, loading }: { onClick: () => void; loading?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-dim hover:text-foreground transition-colors"
    aria-label="Refresh"
  >
    <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
  </button>
);

export const UpdatedAgo = ({ date }: { date: Date | undefined }) => {
  if (!date) return null;
  return (
    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-3 pt-2 border-t border-border/60">
      Updated {formatDistanceToNow(date, { addSuffix: true })}
    </div>
  );
};

// ============ Semicircle Gauge ============
export const SemiGauge = ({
  value,
  min = 0,
  max = 9,
  zones,
  label,
  size = 180,
}: {
  value: number;
  min?: number;
  max?: number;
  zones: { from: number; to: number; color: string }[];
  label?: string;
  size?: number;
}) => {
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 14;

  const polar = (angleDeg: number, r: number) => {
    const a = ((angleDeg - 180) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const arcPath = (startDeg: number, endDeg: number, r: number) => {
    const [x1, y1] = polar(startDeg, r);
    const [x2, y2] = polar(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const valueToDeg = (v: number) => {
    const clamped = Math.max(min, Math.min(max, v));
    return ((clamped - min) / (max - min)) * 180;
  };

  const needleAngle = valueToDeg(value);
  const [nx, ny] = polar(needleAngle, radius - 4);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        {zones.map((z, i) => (
          <path
            key={i}
            d={arcPath(valueToDeg(z.from), valueToDeg(z.to), radius)}
            stroke={z.color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="butt"
            opacity={0.85}
          />
        ))}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="hsl(var(--foreground))" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="hsl(var(--foreground))" />
      </svg>
      {label && <div className="font-mono text-[10px] uppercase tracking-wider text-dim -mt-2">{label}</div>}
    </div>
  );
};
