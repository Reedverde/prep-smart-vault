import { PageContainer } from "@/components/PageContainer";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Loader2 } from "lucide-react";
import { WeatherPanel } from "@/components/panels/WeatherPanel";
import { AlertsPanel } from "@/components/panels/AlertsPanel";
import { EarthquakesPanel } from "@/components/panels/EarthquakesPanel";
import { SpaceWeatherPanel } from "@/components/panels/SpaceWeatherPanel";
import { AirQualityPanel } from "@/components/panels/AirQualityPanel";
import { NationalPanel } from "@/components/panels/NationalPanel";
import { ConflictPulsePanel } from "@/components/panels/ConflictPulsePanel";
import { ActiveDisastersPanel } from "@/components/panels/ActiveDisastersPanel";
import { SystemHealthPanel } from "@/components/panels/SystemHealthPanel";
import { NasaPanel } from "@/components/panels/NasaPanel";
import { GridStatusPanel } from "@/components/panels/GridStatusPanel";
import { GlobalHeadlinesPanel } from "@/components/panels/GlobalHeadlinesPanel";

const debugRows = new URLSearchParams(window.location.search).get("debug") === "rows";

const RowLabel = ({ children }: { children: string }) =>
  debugRows ? (
    <div className="font-mono text-[10px] tracking-[0.2em] text-dim mb-1 uppercase">
      {children}
    </div>
  ) : null;

const rowGrid = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4 auto-rows-fr";

const Dashboard = () => {
  const { settings, loading } = useUserSettings();

  if (loading || !settings) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-dim" />
        </div>
      </PageContainer>
    );
  }

  const refreshMs = (settings.refresh_interval_min || 10) * 60 * 1000;
  const { latitude: lat, longitude: lng } = settings;

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span className="text-primary">■</span>
        <span className="text-foreground uppercase tracking-wider">{settings.location_name}</span>
        <span className="text-dim">·</span>
        <span className="text-dim uppercase tracking-wider">
          {lat.toFixed(3)}, {lng.toFixed(3)} · refresh {settings.refresh_interval_min} min
        </span>
      </div>

      {/* Row 1 — LOCAL */}
      <RowLabel>LOCAL</RowLabel>
      <div className={rowGrid}>
        <WeatherPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        <AlertsPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        <AirQualityPanel lat={lat} lng={lng} refreshMs={refreshMs} />
      </div>

      {/* Row 2 — NEWS + NATIONAL */}
      <RowLabel>NEWS + NATIONAL</RowLabel>
      <div className={rowGrid}>
        <GlobalHeadlinesPanel refreshMs={refreshMs} />
        <NationalPanel refreshMs={refreshMs} />
        <GridStatusPanel refreshMs={refreshMs} />
      </div>

      {/* Row 3 — WORLD */}
      <RowLabel>WORLD</RowLabel>
      <div className={rowGrid}>
        <EarthquakesPanel refreshMs={refreshMs} lat={lat} lng={lng} />
        <ActiveDisastersPanel refreshMs={refreshMs} />
        <ConflictPulsePanel refreshMs={refreshMs} />
      </div>

      {/* Row 4 — SPACE + SYSTEM */}
      <RowLabel>SPACE + SYSTEM</RowLabel>
      <div className={rowGrid}>
        <SpaceWeatherPanel refreshMs={refreshMs} />
        <NasaPanel refreshMs={refreshMs} />
        <SystemHealthPanel refreshMin={settings.refresh_interval_min} />
      </div>
    </PageContainer>
  );
};

export default Dashboard;
