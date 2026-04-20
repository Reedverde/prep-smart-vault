export const LiveIndicator = ({ label = "LIVE" }: { label?: string }) => (
  <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-dim">
    <span className="live-dot" />
    {label}
  </span>
);
