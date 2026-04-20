import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { LiveIndicator } from "./LiveIndicator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import { InstallAppButton } from "./InstallAppButton";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/snapshots", label: "Snapshots" },
  { to: "/library", label: "Library" },
  { to: "/operations", label: "Operations" },
  { to: "/settings", label: "Settings" },
];

export const TopNav = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const tz = settings?.timezone || "America/New_York";
  const time = now.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <NavLink to="/dashboard" className="flex items-center">
            <Logo size="md" />
          </NavLink>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-colors",
                    isActive
                      ? "text-accent bg-accent/10"
                      : "text-dim hover:text-foreground hover:bg-secondary",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <LiveIndicator />
            <span className="font-mono text-xs text-dim tabular-nums">{time}</span>
          </div>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hidden md:inline-flex font-mono text-xs uppercase tracking-wider text-dim hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          )}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-b border-border bg-card">
          <div className="px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 rounded-md font-mono text-sm uppercase tracking-wider",
                    isActive
                      ? "text-accent bg-accent/10"
                      : "text-dim hover:text-foreground hover:bg-secondary",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="px-3 py-2 mt-2 rounded-md font-mono text-sm uppercase tracking-wider text-dim hover:text-foreground hover:bg-secondary text-left"
            >
              Sign out
            </button>
            <div className="px-3 py-2 mt-2 flex items-center justify-between border-t border-border">
              <LiveIndicator />
              <span className="font-mono text-xs text-dim tabular-nums">{time}</span>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};
