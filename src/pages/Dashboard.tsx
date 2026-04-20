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

  /*
    CSS-columns masonry, column-major flow.
    Mobile (1 col): Alerts, Weather, Earthquakes, ConflictPulse,
                    SpaceWeather, AirQuality, National, ActiveDisasters,
                    GridStatus, NASA, GlobalHeadlines, SystemHealth
    md (2 col): col-major fill across 2 columns
    xl (3 col): col-major fill across 3 columns:
      Col 1: Alerts, Weather, Earthquakes, ConflictPulse
      Col 2: SpaceWeather, AirQuality, National, ActiveDisasters
      Col 3: GridStatus, NASA, GlobalHeadlines, SystemHealth
  */
  const wrap = "break-inside-avoid mb-4";

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

      <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
        {/* Col 1 */}
        <div className={wrap}><AlertsPanel lat={lat} lng={lng} refreshMs={refreshMs} /></div>
        <div className={wrap}><WeatherPanel lat={lat} lng={lng} refreshMs={refreshMs} /></div>
        <div className={wrap}><EarthquakesPanel refreshMs={refreshMs} lat={lat} lng={lng} /></div>
        <div className={wrap}><ConflictPulsePanel refreshMs={refreshMs} /></div>

        {/* Col 2 */}
        <div className={wrap}><SpaceWeatherPanel refreshMs={refreshMs} /></div>
        <div className={wrap}><AirQualityPanel lat={lat} lng={lng} refreshMs={refreshMs} /></div>
        <div className={wrap}><NationalPanel refreshMs={refreshMs} /></div>
        <div className={wrap}><ActiveDisastersPanel refreshMs={refreshMs} /></div>

        {/* Col 3 */}
        <div className={wrap}><GridStatusPanel refreshMs={refreshMs} /></div>
        <div className={wrap}><NasaPanel refreshMs={refreshMs} /></div>
        <div className={wrap}><GlobalHeadlinesPanel refreshMs={refreshMs} /></div>
        <div className={wrap}><SystemHealthPanel refreshMin={settings.refresh_interval_min} /></div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
