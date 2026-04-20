import { PageContainer } from "@/components/PageContainer";
import { Panel } from "@/components/Panel";
import { useUserSettings } from "@/hooks/useUserSettings";

const PANELS = [
  { title: "Current Weather", source: "NWS" },
  { title: "Active Alerts", source: "NWS" },
  { title: "Earthquakes", source: "USGS" },
  { title: "Space Weather", source: "SWPC" },
  { title: "Air Quality", source: "AirNow" },
  { title: "National", source: "NOAA" },
  { title: "US Alerts", source: "FEMA" },
  { title: "Global Situation", source: "ACLED" },
  { title: "System Health", source: "PrepPi" },
];

const Dashboard = () => {
  const { settings } = useUserSettings();
  return (
    <PageContainer>
      {/* Location banner */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span className="text-primary">■</span>
        <span className="text-foreground uppercase tracking-wider">
          {settings?.location_name || "—"}
        </span>
        <span className="text-dim">·</span>
        <span className="text-dim uppercase tracking-wider">
          Data refreshes every {settings?.refresh_interval_min ?? 10} min
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PANELS.map((p) => (
          <Panel key={p.title} title={p.title} source={p.source} className="min-h-[200px]">
            <div className="h-full flex items-center justify-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Coming in Stage 2
            </div>
          </Panel>
        ))}
      </div>
    </PageContainer>
  );
};

export default Dashboard;
