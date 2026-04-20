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
import { NasaPanel } from "@/components/panels/NasaPanel";
import { GridStatusPanel } from "@/components/panels/GridStatusPanel";
import { NewsPanel } from "@/components/panels/NewsPanel";

const US_STATE_CODES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

const US_STATE_NAMES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

const resolveStateCode = (locationName: string | null): string | null => {
  if (!locationName) return null;
  const trailing = locationName.match(/,\s*([A-Z]{2})\s*$/i);
  if (trailing) {
    const code = trailing[1].toUpperCase();
    if (US_STATE_CODES.has(code)) return code;
  }
  const segments = locationName.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length) {
    const last = segments[segments.length - 1].toLowerCase();
    if (US_STATE_NAMES[last]) return US_STATE_NAMES[last];
  }
  return null;
};

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
  const stateCode = resolveStateCode(settings.location_name);

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

      {/*
        Mobile order: Alerts → Weather → Earthquakes → Space Wx → NASA → Air Quality
                    → Grid Status → National → News → Global → System Health
        xl (3-col):
          Row 1: Weather       Alerts        Earthquakes
          Row 2: Space Wx      NASA          Air Quality
          Row 3: Grid Status   National      News
          Row 4: Global (col-span-2)         System Health
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
        {/* Row 1 */}
        <div className="order-1 xl:order-1">
          <WeatherPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        </div>
        <div className="order-0 xl:order-2">
          <AlertsPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        </div>
        <div className="order-2 xl:order-3">
          <EarthquakesPanel refreshMs={refreshMs} />
        </div>

        {/* Row 2 */}
        <div className="order-3 xl:order-4">
          <SpaceWeatherPanel refreshMs={refreshMs} />
        </div>
        <div className="order-4 xl:order-5">
          <NasaPanel refreshMs={refreshMs} />
        </div>
        <div className="order-5 xl:order-6">
          <AirQualityPanel lat={lat} lng={lng} refreshMs={refreshMs} />
        </div>

        {/* Row 3 */}
        <div className="order-6 xl:order-7">
          <GridStatusPanel refreshMs={refreshMs} />
        </div>
        <div className="order-7 xl:order-8">
          <NationalPanel refreshMs={refreshMs} />
        </div>
        <div className="order-8 xl:order-9">
          <NewsPanel state={stateCode} refreshMs={refreshMs} />
        </div>

        {/* Row 4 */}
        <div className="order-9 md:col-span-2 xl:order-10 xl:col-span-2">
          <GlobalPanel refreshMs={refreshMs} />
        </div>
        <div className="order-10 xl:order-11">
          <SystemHealthPanel refreshMin={settings.refresh_interval_min} />
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
