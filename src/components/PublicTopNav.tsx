import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { LiveIndicator } from "./LiveIndicator";
import { InstallAppButton } from "./InstallAppButton";

export const PublicTopNav = ({ locationName, timezone }: { locationName: string; timezone: string }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo size="md" />
          <span className="hidden sm:inline-flex items-center gap-2 px-2 py-0.5 rounded border border-border font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
            Public · Read-only
          </span>
        </div>

        <div className="flex items-center gap-4">
          <InstallAppButton />
          <span className="hidden md:inline font-mono text-xs text-dim uppercase tracking-wider">
            {locationName}
          </span>
          <div className="hidden md:flex items-center gap-4">
            <LiveIndicator />
            <span className="font-mono text-xs text-dim tabular-nums">{time}</span>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <LiveIndicator />
            <span className="font-mono text-xs text-dim tabular-nums">{time}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
