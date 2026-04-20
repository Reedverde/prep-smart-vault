import { PageContainer } from "@/components/PageContainer";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Loader2 } from "lucide-react";
import { WeatherPanel } from "@/components/panels/WeatherPanel";
import { AlertsPanel } from "@/components/panels/AlertsPanel";
import { EarthquakesPanel } from "@/components/panels/EarthquakesPanel";
import { SpaceWeatherPanel } from "@/components/panels/SpaceWeatherPanel";
import { AirQualityPanel } from "@/components/panels/AirQualityPanel";
import { NationalPanel } from "@/components/panels/NationalPanel";
import { GlobalPanel } from "@/components/panels/GlobalPanel";
import { SystemHealthPanel } from "@/components/panels/SystemHealthPanel";

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

      {/* Mobile-first order: Alerts -> Weather -> rest */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
        {/* On mobile, alerts come first; reorder via order classes */}
        <div className="order-1 md:order-2 xl:order-1">
          <WeatherPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        </div>
        <div className="order-0 md:order-1 xl:order-2">
          <AlertsPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        </div>
        <div className="order-2 md:order-3 xl:order-3">
          <EarthquakesPanel refreshMs={refreshMs} />
        </div>
        <div className="order-3 md:order-4 xl:order-4">
          <SpaceWeatherPanel refreshMs={refreshMs} />
        </div>
        <div className="order-4 md:order-5 xl:order-5">
          <AirQualityPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        </div>
        <div className="order-5 md:order-6 xl:order-6">
          <NationalPanel refreshMs={refreshMs} />
        </div>
        <div className="order-6 md:order-7 xl:order-7 md:col-span-2 xl:col-span-2">
          <GlobalPanel refreshMs={refreshMs} />
        </div>
        <div className="order-7 md:order-8 xl:order-8">
          <SystemHealthPanel refreshMin={settings.refresh_interval_min} />
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
